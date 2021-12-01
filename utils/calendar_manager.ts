import dayjs, { Dayjs } from 'dayjs';
import { decryptWithPrivateKey, Encrypted } from 'eth-crypto';
import { DBMeeting, MeetingCreationRequest, MeetingEncrypted, MeetingStatus, ParticipantInfo, ParticipantType } from "../types/Meeting";
import { createMeeting, getAccount, getMeetings } from './api_helper';
import { decryptContent } from './cryptography';
import { TimeNotAvailableError } from './errors';
import { getSignature } from './storage';

const scheduleMeeting = async (sourceAddress: string, targetAddress: string, startTime: Dayjs, endTime: Dayjs, meetingContent?: string): Promise<DBMeeting> => {

    const owner: ParticipantInfo = {
        participant: targetAddress,
        type: ParticipantType.Owner,
        status: MeetingStatus.Pending,
    }

    const scheduler: ParticipantInfo = {
        participant: sourceAddress,
        type: ParticipantType.Scheduler,
        status: MeetingStatus.Accepted,
    }

    const meeting: MeetingCreationRequest = {
        start: startTime.toDate(),
        end: endTime.toDate(),
        participants: [owner, scheduler],
        content: meetingContent
    }

    if (await isTimeAvailable(targetAddress, meeting)) {
        await createMeeting(meeting)
    } else {
        throw new TimeNotAvailableError()
    }

    return meeting
}

const getContentFromEncrypted = async (accountAddress: string, signature: string, encrypted: Encrypted): Promise<string> => {
    const account = await getAccount(accountAddress)
    const pvtKey = decryptContent(signature, account.encoded_signature)
    return await decryptWithPrivateKey(pvtKey, encrypted)
}

// const enhanceMeetingFromDB = async (accountAddress: string, meeting: DBMeeting, encryptedSignature: string): Promise<Meeting> => {
//     const enhancedMeeting: Meeting = {
//         id: meeting._id,
//         source: await getAccount(meeting.source),
//         target: await getAccount(meeting.target),
//         content: meeting.content ? await getContentFromEncrypted(accountAddress, encryptedSignature, meeting.content) : '',
//         startTime: dayjs(meeting.startTime),
//         endTime: dayjs(meeting.endTime),
//     }

//     return enhancedMeeting
// }

const isTimeAvailable = async (accountAddress: string, meeting: DBMeeting): Promise<boolean> => {

    const meetings = await getMeetings(accountAddress, meeting.start, meeting.end);

    return meetings.length === 0
    // Criteria criteria = this.createCriteria();

    // Disjunction disjunction = Restrictions.disjunction();

    // disjunction.add(Restrictions.and(Restrictions.lt("dataHoraInicial", dataHoraInicial),
    //     Restrictions.ge("dataHoraFinal", dataHoraFinal)));

    // disjunction.add(Restrictions.and(Restrictions.lt("dataHoraInicial", dataHoraFinal),
    //     Restrictions.ge("dataHoraInicial", dataHoraInicial)));

    // disjunction
    //     .add(Restrictions.and(Restrictions.gt("dataHoraFinal", dataHoraInicial), Restrictions.le("dataHoraFinal", dataHoraFinal)));

    // disjunction.add(Restrictions.and(Restrictions.gt("dataHoraInicial", dataHoraInicial),
    //         Restrictions.le("dataHoraFinal", dataHoraFinal)));
}

const isSlotAvailable = (slotDurationInMinutes: number, slotTime: Date, meetingsForDay: MeetingEncrypted[]): boolean => {

    const start = dayjs(slotTime)
    const end = dayjs(start).add(slotDurationInMinutes, 'minute')

    const filtered = meetingsForDay.filter(meeting =>
        (meeting.startTime >= start && meeting.endTime <= end) ||
        (meeting.startTime <= start && meeting.endTime >= end) ||
        (meeting.endTime > start && meeting.endTime <= end) ||
        (meeting.startTime >= start && meeting.startTime < end))

    return filtegray.length == 0
}

export { scheduleMeeting, isTimeAvailable, isSlotAvailable }