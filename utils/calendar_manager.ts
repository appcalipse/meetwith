import dayjs, { Dayjs } from 'dayjs';
import { decryptWithPrivateKey, Encrypted } from 'eth-crypto';
import { DBSlot, DBSlotEnhanced, IPFSMeetingInfo, MeetingCreationRequest, MeetingDecrypted, ParticipantBaseInfo, ParticipantType } from "../types/Meeting";
import { createMeeting, getAccount, isSlotFree } from './api_helper';
import { decryptContent } from './cryptography';
import { TimeNotAvailableError } from './errors';
import { getSignature } from './storage';

const scheduleMeeting = async (source_account: string, target_account: string, startTime: Dayjs, endTime: Dayjs, meetingContent?: string): Promise<MeetingDecrypted> => {

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

    const meetingInfo = JSON.parse(await getContentFromEncrypted(meeting.account, getSignature(meeting.account)!, meeting.meeting_info_encrypted)) as IPFSMeetingInfo
    
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

const isSlotAvailable = (slotDurationInMinutes: number, slotTime: Date, meetingsForDay: DBSlot[]): boolean => {

    const start = dayjs(slotTime).toDate()
    const end = dayjs(start).add(slotDurationInMinutes, 'minute').toDate()

    const filtered = meetingsForDay.filter(meeting =>
        (meeting.start >= start && meeting.end <= end) ||
        (meeting.start <= start && meeting.end >= end) ||
        (meeting.end > start && meeting.end <= end) ||
        (meeting.start >= start && meeting.start < end))

    return filtered.length == 0
}

export { scheduleMeeting, isSlotAvailable }