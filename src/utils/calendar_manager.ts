import {
  format,
  getDate,
  getHours,
  getMinutes,
  getMonth,
  getYear,
} from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { Attendee, createEvent, EventAttributes, ReturnObject } from 'ics'
import { v4 as uuidv4 } from 'uuid'

import { Account, DayAvailability, MeetingType } from '../types/Account'
import {
  CreationRequestParticipantMapping,
  DBSlotEnhanced,
  IPFSMeetingInfo,
  MeetingCreationRequest,
  MeetingDecrypted,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
  SchedulingType,
} from '../types/Meeting'
import { Plan } from '../types/Subscription'
import {
  getAccount,
  getExistingAccounts,
  isSlotFreeApiCall,
  scheduleMeeting as apiScheduleMeeting,
  scheduleMeetingAsGuest,
} from './api_helper'
import { appUrl, NO_REPLY_EMAIL } from './constants'
import { decryptContent } from './cryptography'
import {
  InvalidURL,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from './errors'
import { getSlugFromText } from './generic_utils'
import { generateMeetingUrl } from './meeting_call_helper'
import { CalendarServiceHelper } from './services/calendar.helper'
import { getSignature } from './storage'
import { isProAccount } from './subscription_manager'
import { ellipsizeAddress, getAccountDisplayName } from './user_manager'
import { isValidEmail, isValidUrl } from './validations'

export interface GuestParticipant {
  name: string
  email: string
  scheduler: boolean
}

const scheduleMeeting = async (
  schedulingType: SchedulingType,
  target_account_address: string,
  extra_participants: string[],
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  source_account_address?: string,
  guests?: GuestParticipant[],
  sourceName?: string,
  meetingContent?: string,
  meetingUrl?: string
): Promise<MeetingDecrypted> => {
  if (
    source_account_address === target_account_address &&
    extra_participants.length == 0 &&
    guests?.length == 0
  ) {
    throw new MeetingWithYourselfError()
  }

  if (meetingUrl) {
    if (isValidEmail(meetingUrl)) {
      throw new InvalidURL()
    }
    if (!isValidUrl(meetingUrl)) {
      meetingUrl = `https://${meetingUrl}`
      if (!isValidUrl(meetingUrl)) {
        throw new InvalidURL()
      }
    }
  }

  if (
    source_account_address === target_account_address ||
    (
      await isSlotFreeApiCall(
        target_account_address,
        startTime,
        endTime,
        meetingTypeId
      )
    ).isFree
  ) {
    const allAccounts: Account[] = await getExistingAccounts([
      source_account_address ? source_account_address : '',
      target_account_address,
      ...extra_participants,
    ])

    const participants: ParticipantInfo[] = []

    for (const account of allAccounts) {
      const participant: ParticipantInfo = {
        type:
          account.address === target_account_address
            ? ParticipantType.Owner
            : account.address === source_account_address
            ? ParticipantType.Scheduler
            : ParticipantType.Invitee,
        account_address: account.address,
        status:
          account.address == source_account_address
            ? ParticipationStatus.Accepted
            : ParticipationStatus.Pending,
        slot_id: uuidv4(),
        name:
          account.address === source_account_address
            ? sourceName || getAccountDisplayName(account)
            : getAccountDisplayName(account),
        guest_email: '',
      }
      participants.push(participant)
    }

    const invitedAccounts = extra_participants.filter(
      participant =>
        !allAccounts
          .map(account => account.address.toLowerCase())
          .includes(participant.toLowerCase())
    )

    for (const account of invitedAccounts) {
      const participant: ParticipantInfo = {
        type: ParticipantType.Invitee,
        account_address: account,
        status: ParticipationStatus.Pending,
        slot_id: uuidv4(),
      }

      participants.push(participant)
    }

    if (guests) {
      for (const guest of guests) {
        const participant: ParticipantInfo = {
          type: !!guest.scheduler
            ? ParticipantType.Scheduler
            : ParticipantType.Invitee,
          status: !!guest.scheduler
            ? ParticipationStatus.Accepted
            : ParticipationStatus.Pending,
          guest_email: guest.email,
          name: guest.name,
          slot_id: uuidv4(),
        }

        participants.push(participant)
      }
    }

    const privateInfo: IPFSMeetingInfo = {
      created_at: new Date(),
      participants: participants,
      content: meetingContent,
      meeting_url: meetingUrl || (await generateMeetingUrl()),
      change_history_paths: [],
    }
    const participantsMappings = []
    for (const participant of participants) {
      const participantMapping: CreationRequestParticipantMapping = {
        account_address: participant.account_address
          ? participant.account_address
          : '',
        slot_id: participant.slot_id,
        type: participant.type,
        privateInfo: await encryptWithPublicKey(
          allAccounts.filter(
            account => account.address == participant.account_address
          )[0]?.internal_pub_key || process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
          JSON.stringify(privateInfo)
        ),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        name: participant.name || '',
        guest_email: participant.guest_email,
        status: participant.status,
      }
      participantsMappings.push(participantMapping)
    }

    const meeting: MeetingCreationRequest = {
      type: schedulingType,
      start: startTime,
      end: endTime,
      participants_mapping: participantsMappings,
      meetingTypeId,
      meeting_url: privateInfo['meeting_url'],
      content: privateInfo['content'],
    }

    try {
      let slot: DBSlotEnhanced
      if (schedulingType === SchedulingType.GUEST) {
        slot = await scheduleMeetingAsGuest(meeting)
      } else {
        slot = await apiScheduleMeeting(meeting)
      }

      if (source_account_address) {
        const schedulerAccount = await getAccount(source_account_address!)
        return await decryptMeeting(slot, schedulerAccount)
      }

      return {
        id: slot.id!,
        ...meeting,
        created_at: meeting.start,
        participants: [],
        content: '',
        meeting_url: '',
        start: meeting.start,
        end: meeting.end,
        meeting_info_file_path: slot.meeting_info_file_path,
      }
    } catch (error: any) {
      throw error
    }
  } else {
    throw new TimeNotAvailableError()
  }
}

const generateIcs = (
  meeting: MeetingDecrypted,
  ownerAddress: string
): ReturnObject => {
  let url = meeting.meeting_url.trim()
  if (!isValidUrl(url)) {
    url = 'https://meetwithwallet.xyz'
  }
  const event: EventAttributes = {
    uid: meeting.id,
    start: [
      getYear(meeting.start),
      getMonth(meeting.start) + 1,
      getDate(meeting.start),
      getHours(meeting.start),
      getMinutes(meeting.start),
    ],
    end: [
      getYear(meeting.end),
      getMonth(meeting.end) + 1,
      getDate(meeting.end),
      getHours(meeting.end),
      getMinutes(meeting.end),
    ],
    title: CalendarServiceHelper.getMeetingTitle(
      ownerAddress,
      meeting.participants
    ),
    description: CalendarServiceHelper.getMeetingSummary(
      meeting.content,
      meeting.meeting_url
    ),
    url,
    location: meeting.meeting_url,
    created: [
      getYear(meeting.created_at!),
      getMonth(meeting.created_at!) + 1,
      getDate(meeting.created_at!),
      getHours(meeting.created_at!),
      getMinutes(meeting.created_at!),
    ],
    organizer: {
      // required by some services
      name: 'Meet with Wallet',
      email: NO_REPLY_EMAIL,
    },
    status: 'CONFIRMED',
  }
  event.attendees = []

  for (const participant of meeting.participants) {
    const attendee: Attendee = {
      name: participant.name || participant.account_address,
      email:
        participant.guest_email ||
        noNoReplyEmailForAccount(participant.account_address!),
      rsvp: participant.status === ParticipationStatus.Accepted,
      partstat: participantStatusToICSStatus(participant.status),
      role: 'REQ-PARTICIPANT',
    }

    if (participant.account_address) {
      attendee.dir = getCalendarRegularUrl(participant.account_address!)
    }

    event.attendees.push(attendee)
  }

  return createEvent(event)
}

const participantStatusToICSStatus = (status: ParticipationStatus) => {
  switch (status) {
    case ParticipationStatus.Accepted:
      return 'ACCEPTED'
    case ParticipationStatus.Rejected:
      return 'DECLINED'
    default:
      return 'NEEDS-ACTION'
  }
}

const decryptMeeting = async (
  meeting: DBSlotEnhanced,
  account: Account,
  signature?: string
): Promise<MeetingDecrypted> => {
  const meetingInfo = JSON.parse(
    await getContentFromEncrypted(
      account!,
      signature || getSignature(account!.address)!,
      meeting.meeting_info_encrypted
    )
  ) as IPFSMeetingInfo

  return {
    id: meeting.id!,
    ...meeting,
    created_at: meeting.created_at!,
    participants: meetingInfo.participants,
    content: meetingInfo.content,
    meeting_url: meetingInfo.meeting_url,
    start: new Date(meeting.start),
    end: new Date(meeting.end),
    meeting_info_file_path: meeting.meeting_info_file_path,
  }
}

const getContentFromEncrypted = async (
  account: Account,
  signature: string,
  encrypted: Encrypted
): Promise<string> => {
  try {
    const pvtKey = decryptContent(signature, account.encoded_signature)
    return await decryptWithPrivateKey(pvtKey, encrypted)
  } catch (error) {
    ;(window as any).location = '/logout'
    await new Promise<void>(resolve =>
      setTimeout(() => {
        resolve()
      }, 5000)
    ) //wait redirect
    return ''
  }
}

const generateDefaultAvailabilities = (): DayAvailability[] => {
  const availabilities = []
  for (let i = 0; i <= 6; i++) {
    availabilities.push({
      weekday: i,
      ranges: [defaultTimeRange()],
    })
  }
  return availabilities
}

const defaultTimeRange = () => {
  return { start: '09:00', end: '18:00' }
}

const durationToHumanReadable = (duration: number): string => {
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hour ${minutes} min`
    }
    return `${hours} hour`
  }
  return `${duration} min`
}

const dateToHumanReadable = (
  date: Date,
  timezone: string,
  includeTimezone: boolean
): string => {
  let result = `${format(utcToZonedTime(date, timezone), 'PPPPpp')}`
  if (includeTimezone) {
    result += ` - ${timezone}`
  }
  return result
}

const getAccountDomainUrl = (account: Account, ellipsize?: boolean): string => {
  if (isProAccount(account)) {
    return account.subscriptions.filter(sub => sub.plan_id === Plan.PRO)[0]
      .domain
  }
  return `address/${
    ellipsize ? ellipsizeAddress(account!.address) : account!.address
  }`
}

const getAccountCalendarUrl = (
  account: Account,
  ellipsize?: boolean
): string => {
  return `${appUrl}/${getAccountDomainUrl(account, ellipsize)}`
}

const getCalendarRegularUrl = (account_address: string) => {
  return `${appUrl}/address/${account_address}`
}

const generateDefaultMeetingType = (): MeetingType => {
  const title = '30 minutes meeting'
  const meetingType: MeetingType = {
    id: uuidv4(),
    title,
    url: getSlugFromText(title),
    duration: 30,
    minAdvanceTime: 60,
  }

  return meetingType
}

const generateAllSlots = () => {
  const allSlots: string[] = []
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 15) {
      allSlots.push(
        `${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`
      )
    }
  }
  allSlots.push('24:00')
  return allSlots
}

const noNoReplyEmailForAccount = (account_address: string): string => {
  return `no_reply_${account_address}@meetwithwallet.xyz`
}

const allSlots = generateAllSlots()

export {
  allSlots,
  dateToHumanReadable,
  decryptMeeting,
  defaultTimeRange,
  durationToHumanReadable,
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  generateIcs,
  getAccountCalendarUrl,
  getAccountDomainUrl,
  noNoReplyEmailForAccount,
  scheduleMeeting,
}
