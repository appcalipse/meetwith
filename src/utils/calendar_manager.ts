import { Dayjs } from 'dayjs'
import dayjs from './dayjs_extender'
import {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { Account, DayAvailability, MeetingType } from '../types/Account'
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
} from '../types/Meeting'
import { createMeeting, getAccount, isSlotFree } from './api_helper'
import { decryptContent } from './cryptography'
import { MeetingWithYourselfError, TimeNotAvailableError } from './errors'
import { getSignature } from './storage'
import { appUrl } from './constants'
import { v4 as uuidv4 } from 'uuid'
import { getAccountDisplayName } from './user_manager'
import { generateMeetingUrl } from './meeting_call_helper'
import { logEvent } from './analytics'

const scheduleMeeting = async (
  source_account_id: string,
  target_account_id: string,
  meetingTypeId: string,
  startTime: Dayjs,
  endTime: Dayjs,
  sourceName?: string,
  meetingContent?: string,
  meetingUrl?: string
): Promise<MeetingDecrypted> => {
  if (source_account_id === target_account_id) {
    throw new MeetingWithYourselfError()
  }

  if (
    await isSlotFree(
      target_account_id,
      startTime.toDate(),
      endTime.toDate(),
      meetingTypeId
    )
  ) {
    const ownerAccount = await getAccount(target_account_id)

    const owner: ParticipantInfo = {
      type: ParticipantType.Owner,
      account_id: target_account_id,
      status: ParticipationStatus.Pending,
      address: ownerAccount.address,
      slot_id: uuidv4(),
    }

    const schedulerAccount = await getAccount(source_account_id)
    const scheduler: ParticipantInfo = {
      type: ParticipantType.Scheduler,
      account_id: source_account_id,
      status: ParticipationStatus.Accepted,
      address: schedulerAccount.address,
      slot_id: uuidv4(),
      name: sourceName,
    }

    const privateInfo: IPFSMeetingInfo = {
      created_at: new Date(),
      participants: [owner, scheduler],
      content: meetingContent,
      meeting_url: meetingUrl || (await generateMeetingUrl()),
      change_history_paths: [],
    }

    const ownerMapping: CreationRequestParticipantMapping = {
      account_id: target_account_id,
      slot_id: owner.slot_id,
      privateInfo: await encryptWithPublicKey(
        ownerAccount.internal_pub_key,
        JSON.stringify(privateInfo)
      ),
    }

    const schedulerMapping: CreationRequestParticipantMapping = {
      account_id: source_account_id,
      slot_id: scheduler.slot_id,
      privateInfo: await encryptWithPublicKey(
        schedulerAccount.internal_pub_key,
        JSON.stringify(privateInfo)
      ),
    }

    const meeting: MeetingCreationRequest = {
      start: startTime.toDate(),
      end: endTime.toDate(),
      participants_mapping: [ownerMapping, schedulerMapping],
      meetingTypeId,
    }

    const slot = await createMeeting(meeting)

    return await decryptMeeting(slot)
  } else {
    throw new TimeNotAvailableError()
  }
}

const generateIcs = async (meeting: MeetingDecrypted) => {
  const event = {
    uid: meeting.id,
    start: [
      meeting.start.year(),
      meeting.start.month() + 1,
      meeting.start.date(),
      meeting.start.hour(),
      meeting.start.minute(),
    ],
    end: [
      meeting.end.year(),
      meeting.end.month() + 1,
      meeting.end.date(),
      meeting.end.hour(),
      meeting.end.minute(),
    ],
    title: `Meeting: ${meeting.participants
      .map(participant => participant.name || participant.address)
      .join(', ')}`,
    description: meeting.content,
    url: meeting.meeting_url,
    created: [
      meeting.created_at!.year(),
      meeting.created_at!.month() + 1,
      meeting.created_at!.date(),
      meeting.created_at!.hour(),
      meeting.created_at!.minute(),
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
  meeting: DBSlotEnhanced
): Promise<MeetingDecrypted> => {
  const account = await getAccount(meeting.account_pub_key)

  const meetingInfo = JSON.parse(
    await getContentFromEncrypted(
      account.address,
      getSignature(account.address)!,
      meeting.meeting_info_encrypted
    )
  ) as IPFSMeetingInfo

  return {
    id: meeting.id!,
    ...meeting,
    created_at: dayjs(meeting.created_at!),
    participants: meetingInfo.participants,
    content: meetingInfo.content,
    meeting_url: meetingInfo.meeting_url,
    start: dayjs(meeting.start),
    end: dayjs(meeting.end),
  }
}

const getContentFromEncrypted = async (
  accountAddress: string,
  signature: string,
  encrypted: Encrypted
): Promise<string> => {
  const account = await getAccount(accountAddress)
  const pvtKey = decryptContent(signature, account.encoded_signature)
  return await decryptWithPrivateKey(pvtKey, encrypted)
}

const isSlotAvailable = (
  slotDurationInMinutes: number,
  minAdvanceTime: number,
  slotTime: Date,
  meetings: DBSlot[],
  availabilities: DayAvailability[],
  targetTimezone: string,
  sourceTimezone: string,
): boolean => {
  const start = dayjs(slotTime).toDate()

  if (dayjs().add(minAdvanceTime, 'minute').toDate() > start) {
    return false
  }
  const end = dayjs(start).add(slotDurationInMinutes, 'minute').toDate()

  if (
    !isTimeInsideAvailabilities(
      dayjs(start),
      dayjs(end),
      availabilities,
      targetTimezone,
      sourceTimezone
    )
  )
    return false

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
  start: Dayjs,
  end: Dayjs,
  availabilities: DayAvailability[],
  targetTimezone: string,
  sourceTimezone: string,
): boolean => {

  
  const startForSource = dayjs.utc(start.format("YYYY-MM-DD HH:mm")).tz(sourceTimezone)
  const startForTarget = startForSource.clone().tz(targetTimezone)

  const startTime = startForTarget.format('HH:mm')
  let endTime = end.tz(targetTimezone).format('HH:mm')
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
    endTime = `${end.tz(targetTimezone).hour() + 24}:00`
  }

  for (const availability of availabilities) {
    if (availability.weekday === startForTarget.day()) {
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
  return `${appUrl}${
    ellipsize ? getAccountDisplayName(account) : account!.address
  }`
}

const generateDefaultMeetingType = (): MeetingType => {
  const title = '30 minutes meeting'
  const meetingType: MeetingType = {
    id: uuidv4(),
    title,
    url: generateMeetingTypeUrl(title),
    duration: 30,
    minAdvanceTime: 60,
  }

  return meetingType
}

const generateMeetingTypeUrl = (title: string): string => {
  return title.toLowerCase().replace(/ /g, '-')
}

export {
  generateIcs,
  generateMeetingTypeUrl,
  scheduleMeeting,
  generateDefaultMeetingType,
  isSlotAvailable,
  decryptMeeting,
  generateDefaultAvailabilities,
  defaultTimeRange,
  durationToHumanReadable,
  getAccountCalendarUrl,
}
