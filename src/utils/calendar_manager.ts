import {
  addMinutes,
  format,
  getDate,
  getDay,
  getHours,
  getMinutes,
  getMonth,
  getYear,
  isAfter,
} from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { v4 as uuidv4 } from 'uuid'

import {
  Account,
  DayAvailability,
  MeetingType,
  PremiumAccount,
} from '../types/Account'
import {
  CreationRequestParticipantMapping,
  DBSlot,
  DBSlotEnhanced,
  IPFSMeetingInfo,
  MeetingCreationRequest,
  MeetingDecrypted,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
  SchedulingType,
} from '../types/Meeting'
import { logEvent } from './analytics'
import {
  createMeeting,
  getAccount,
  getExistingAccounts,
  isSlotFree,
  syncExternalCalendars,
} from './api_helper'
import { appUrl } from './constants'
import { decryptContent } from './cryptography'
import { MeetingWithYourselfError, TimeNotAvailableError } from './errors'
import { getSlugFromText } from './generic_utils'
import { generateMeetingUrl } from './meeting_call_helper'
import { getSignature } from './storage'
import { getAccountDisplayName } from './user_manager'

const scheduleMeeting = async (
  schedulingType: SchedulingType,
  target_account_address: string,
  extra_participants: string[],
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  source_account_address?: string,
  guest_email?: string,
  sourceName?: string,
  meetingContent?: string,
  meetingUrl?: string
): Promise<MeetingDecrypted> => {
  if (
    source_account_address === target_account_address &&
    extra_participants.length == 0
  ) {
    throw new MeetingWithYourselfError()
  }

  if (
    source_account_address === target_account_address ||
    (await isSlotFree(
      target_account_address,
      startTime,
      endTime,
      meetingTypeId
    ))
  ) {
    const allAccounts = await getExistingAccounts([
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
        name: account.address == source_account_address ? sourceName : '',
        email: guest_email,
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

    if (schedulingType === SchedulingType.GUEST) {
      const participant: ParticipantInfo = {
        type: ParticipantType.Guest,
        status: ParticipationStatus.Accepted,
        email: guest_email,
        name: sourceName,
        slot_id: uuidv4(),
      }

      participants.push(participant)
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
        email: participant.account_address ? '' : participant.email,
        slot_id: participant.slot_id,
        type: participant.type,
        privateInfo: await encryptWithPublicKey(
          allAccounts.filter(
            account => account.address == participant.account_address
          )[0]?.internal_pub_key || process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
          JSON.stringify(privateInfo)
        ),
      }
      participantsMappings.push(participantMapping)
    }

    const meeting: MeetingCreationRequest = {
      start: startTime,
      end: endTime,
      participants_mapping: participantsMappings,
      meetingTypeId,
    }

    let slot: DBSlotEnhanced
    if (schedulingType === SchedulingType.GUEST) {
      slot = await createMeeting(meeting)
    } else {
      //TODO: add endpoint for this case
      slot = await createMeeting(meeting)
    }

    const schedulerAccount = await getAccount(source_account_address!)

    // now that we have successfully created the event, then we will try to
    // intergate with the external calendars that the user has
    await syncExternalCalendars(slot.id!)

    return await decryptMeeting(slot, schedulerAccount)
  } else {
    throw new TimeNotAvailableError()
  }
}

const generateIcs = async (meeting: MeetingDecrypted) => {
  const event = {
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
    title: `Meeting: ${meeting.participants
      .map(participant => participant.name || participant.account_address)
      .join(', ')}`,
    description: meeting.content,
    url: meeting.meeting_url,
    created: [
      getYear(meeting.created_at!),
      getMonth(meeting.created_at!) + 1,
      getDate(meeting.created_at!),
      getHours(meeting.created_at!),
      getMinutes(meeting.created_at!),
    ],
    //        status: 'CONFIRMED',
    // organizer: { name: 'Admin', email: 'Race@BolderBOULDER.com' },
    // attendees: [
    //   { name: 'Adam Gibbons', email: 'adam@example.com', rsvp: true, partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT' },
    //   { name: 'Brittany Seaton', email: 'brittany@example2.org', dir: 'https://linkedin.com/in/brittanyseaton', role: 'OPT-PARTICIPANT' }
    // ]
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ics = require('ics')

  const icsFile = await ics.createEvent(event)

  if (!icsFile.error) {
    const url = window.URL.createObjectURL(
      new Blob([icsFile.value], { type: 'text/plain' })
    )
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${meeting.id}.ics`)

    document.body.appendChild(link)
    link.click()
    link.parentNode!.removeChild(link)
    logEvent('Downloaded .ics')
  } else {
    console.error(icsFile.error)
  }
}

const decryptMeeting = async (
  meeting: DBSlotEnhanced,
  account: Account,
  signature?: string
): Promise<MeetingDecrypted> => {
  const meetingInfo = JSON.parse(
    await getContentFromEncrypted(
      account,
      signature || getSignature(account.address)!,
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
    start: meeting.start,
    end: meeting.end,
  }
}

const getContentFromEncrypted = async (
  account: Account,
  signature: string,
  encrypted: Encrypted
): Promise<string> => {
  const pvtKey = decryptContent(signature, account.encoded_signature)
  return await decryptWithPrivateKey(pvtKey, encrypted)
}

const isSlotAvailable = (
  slotDurationInMinutes: number,
  minAdvanceTime: number,
  slotTime: Date,
  meetings: DBSlot[],
  availabilities: DayAvailability[],
  targetTimezone: string
): boolean => {
  const start = slotTime

  if (isAfter(addMinutes(new Date(), minAdvanceTime), start)) {
    return false
  }

  const startForTarget = utcToZonedTime(start, targetTimezone)
  const end = addMinutes(startForTarget, slotDurationInMinutes)

  if (!isTimeInsideAvailabilities(startForTarget, end, availabilities)) {
    return false
  }

  const filtered = meetings.filter(
    meeting =>
      (meeting.start >= start && meeting.end <= end) ||
      (meeting.start <= start && meeting.end >= end) ||
      (meeting.end > start && meeting.end <= end) ||
      (meeting.start >= start && meeting.start < end)
  )

  return filtered.length == 0
}

const isTimeInsideAvailabilities = (
  start: Date,
  end: Date,
  availabilities: DayAvailability[]
): boolean => {
  const startTime = format(start, 'HH:mm')
  let endTime = format(end, 'HH:mm')
  if (endTime === '00:00') {
    endTime = '24:00'
  }

  const compareTimes = (t1: string, t2: string) => {
    const [h1, m1] = t1.split(':')
    const [h2, m2] = t2.split(':')

    if (h1 !== h2) {
      return h1 > h2 ? 1 : -1
    }

    if (m1 !== m2) {
      return m1 > m2 ? 1 : -1
    }

    return 0
  }

  //After midnight
  if (compareTimes(startTime, endTime) > 0) {
    endTime = `${getHours(end) + 24}:00`
  }

  for (const availability of availabilities) {
    if (availability.weekday === getDay(start)) {
      for (const range of availability.ranges) {
        if (compareTimes(startTime, range.start) >= 0) {
          if (compareTimes(endTime, range.end) <= 0) {
            return true
          }
        }
      }
    }
  }

  return false
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

const getAccountCalendarUrl = (account: Account, ellipsize?: boolean) => {
  if ((account as PremiumAccount).calendar_url) {
    return `${appUrl}${(account as PremiumAccount).calendar_url}`
  }
  return `${appUrl}address/${
    ellipsize ? getAccountDisplayName(account) : account!.address
  }`
}

const getEmbedCode = (account: Account, ellipsize?: boolean) => {
  if ((account as PremiumAccount).calendar_url) {
    return `<iframe src="${appUrl}embed/${
      (account as PremiumAccount).calendar_url
    }"></iframe>`
  }
  return `<iframe src="${appUrl}embed/${
    ellipsize ? getAccountDisplayName(account) : account!.address
  }"></iframe>`
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
const allSlots = generateAllSlots()

export {
  allSlots,
  decryptMeeting,
  defaultTimeRange,
  durationToHumanReadable,
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  generateIcs,
  getAccountCalendarUrl,
  getEmbedCode,
  isSlotAvailable,
  isTimeInsideAvailabilities,
  scheduleMeeting,
}
