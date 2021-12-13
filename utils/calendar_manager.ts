import { Dayjs } from 'dayjs';
import dayjs from '../utils/dayjs_entender'
import { decryptWithPrivateKey, Encrypted } from 'eth-crypto';
import { DayAvailability } from '../types/Account';
import { DBSlot, DBSlotEnhanced, IPFSMeetingInfo, MeetingCreationRequest, MeetingDecrypted, ParticipantBaseInfo, ParticipantType } from "../types/Meeting";
import { createMeeting, getAccount, isSlotFree } from './api_helper';
import { decryptContent } from './cryptography';
import { MeetingWithYourselfError, TimeNotAvailableError } from './errors';
import { getSignature } from './storage';

const scheduleMeeting = async (source_account: string, target_account: string, startTime: Dayjs, endTime: Dayjs, meetingContent?: string): Promise<MeetingDecrypted> => {

    if(source_account === target_account) {
        throw new MeetingWithYourselfError()
    }

    if (await isSlotFree(target_account, startTime.toDate(), endTime.toDate())) {
        const owner: ParticipantBaseInfo = {
            type: ParticipantType.Owner,
            account_identifier: target_account,
        }

        const scheduler: ParticipantBaseInfo = {
            type: ParticipantType.Scheduler,
            account_identifier: source_account,
        }

        const meeting: MeetingCreationRequest = {
            start: startTime.toDate(),
            end: endTime.toDate(),
            participants: [owner, scheduler],
            content: meetingContent
        }

        const slot = await createMeeting(meeting)

        return await decryptMeeting(slot)
    } else {
        throw new TimeNotAvailableError()
    }
}

const decryptMeeting = async (meeting: DBSlotEnhanced): Promise<MeetingDecrypted> => {

    const account = await getAccount(meeting.account_pub_key)

    const meetingInfo = JSON.parse(await getContentFromEncrypted(account.address, getSignature(account.address)!, meeting.meeting_info_encrypted)) as IPFSMeetingInfo
    
    return {
        ...meeting,
        participants: meetingInfo.participants,
        content: meetingInfo.content,
        meeting_url: meetingInfo.meeting_url,
        start: dayjs(meeting.start),
        end: dayjs(meeting.end)
    }    
}

const getContentFromEncrypted = async (accountAddress: string, signature: string, encrypted: Encrypted): Promise<string> => {
    const account = await getAccount(accountAddress)
    const pvtKey = decryptContent(signature, account.encoded_signature)
    return await decryptWithPrivateKey(pvtKey, encrypted)
}

const isSlotAvailable = (slotDurationInMinutes: number, slotTime: Date, meetings: DBSlot[], availabilities: DayAvailability[], timezone: string): boolean => {

    const start = dayjs(slotTime).toDate()
    const end = dayjs(start).add(slotDurationInMinutes, 'minute').toDate()

    if(!isTimeInsideAvailabilities(dayjs(start), dayjs(end), availabilities, timezone)) return false

    const filtered = meetings.filter(meeting =>
        (meeting.start >= start && meeting.end <= end) ||
        (meeting.start <= start && meeting.end >= end) ||
        (meeting.end > start && meeting.end <= end) ||
        (meeting.start >= start && meeting.start < end))

    return filtered.length == 0
}

const isTimeInsideAvailabilities = (start: Dayjs, end: Dayjs, availabilities: DayAvailability[], timezone: string): boolean => {
    
    const realStart = start.tz(timezone)
    
    const startTime = realStart.format("HH:mm")
    let endTime = end.tz(timezone).format("HH:mm")
    if(endTime === "00:00") {
        endTime = "24:00"
    }


    const compareTimes = (t1: string, t2: string) => {
        const [h1, m1] = t1.split(":")
        const [h2, m2] = t2.split(":")

        if(h1 !== h2) {
            return h1 > h2 ? 1 : -1
        }

        if(m1 !== m2) {
            return m1 > m2 ? 1 : -1
        }

        return 0
    }

    for(const availability of availabilities) {
        if(availability.weekday === realStart.day()) {
            for(const range of availability.ranges) {
                if(compareTimes(startTime, range.start) >= 0) {
                    if(compareTimes(endTime, range.end) < 0) {    
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
    for(let i = 0; i < 6; i++) {
        availabilities.push({
            weekday: i,
           ranges: [defaultTimeRange()]
        })
    }
    return availabilities
}

const defaultTimeRange = () => {
    return {start: "09:00", end: "18:00"}
}

export { scheduleMeeting, isSlotAvailable, decryptMeeting, generateDefaultAvailabilities, defaultTimeRange}