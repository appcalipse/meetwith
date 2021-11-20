import dayjs, { Dayjs } from 'dayjs';
import { decryptWithPrivateKey, Encrypted, encryptWithPublicKey } from 'eth-crypto';
import { v4 as uuidv4 } from 'uuid';
import { DBMeeting, Meeting } from "../types/Meeting";
import { decryptContent } from './cryptography';
import { getAccount, getMeetingDBForUser as getMeetingDBForAccount, saveMeeting } from "./database";
import { getSignature } from './storage';

const scheduleMeeting = async (sourceAddress: string, targetAddress: string, startTime: Dayjs, endTime: Dayjs, meetingContent?: string): Promise<DBMeeting> => {

    const targetAccount = await getAccount(targetAddress)

    const meeting = { _id: uuidv4(), source: sourceAddress, target: targetAddress, startTime: startTime.valueOf(), endTime: endTime.valueOf() }

    if (await isTimeAvailable(targetAddress, meeting)) {
        await saveMeeting(meeting, meetingContent)
    } else {
        throw new TimeNotAvailableError()
    }

    return meeting
}

const fetchAccountMeetings = async (accountAddress: string, from?: Date, to?: Date): Promise<Meeting[]> => {
    const accountMeetingsDB = await getMeetingDBForAccount(accountAddress);
    const response = await accountMeetingsDB.query((event: DBMeeting) => event.startTime >= (from ? from : 0) && event.endTime <= (to ? to : 9999999999999999))
    accountMeetingsDB.close()

    return await Promise.all(response.map(async (meeting: DBMeeting) => await enhanceMeetingFromDB(accountAddress, meeting, getSignature(accountAddress)!)))
}

const getContentFromEncrypted = async (accountAddress: string, signature: string, encrypted: Encrypted): Promise<string> => {
    const account = await getAccount(accountAddress)
    const pvtKey = decryptContent(signature, account.encodedSignature)
    return await decryptWithPrivateKey(pvtKey, encrypted)
}

const enhanceMeetingFromDB = async (accountAddress: string, meeting: DBMeeting, encryptedSignature: string): Promise<Meeting> => {
    const enhancedMeeting: Meeting = {
        source: await getAccount(meeting.source),
        target: await getAccount(meeting.target),
        content: meeting.content ? await getContentFromEncrypted(accountAddress, encryptedSignature, meeting.content) : '',
        startTime: dayjs(meeting.startTime),
        endTime: dayjs(meeting.endTime),
    }

    return enhancedMeeting
}

const isTimeAvailable = async (accountAddress: string, meeting: DBMeeting): Promise<boolean> => {

    const accountMeetingsDB = await getMeetingDBForAccount(accountAddress);
    const meetings = await accountMeetingsDB.query((event: DBMeeting) =>
        (event.startTime < meeting.startTime.valueOf() && event.endTime >= meeting.endTime.valueOf()) ||
        (event.startTime < meeting.endTime.valueOf() && event.startTime >= meeting.startTime.valueOf()) ||
        (event.endTime > meeting.startTime.valueOf() && event.endTime < meeting.endTime.valueOf()) ||
        (event.startTime > meeting.startTime.valueOf() && event.endTime <= meeting.endTime.valueOf()))
    accountMeetingsDB.close()
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

const isSlotAvailable = (slotDurationInMinutes: number, slotTime: Date, meetingsForDay: Meeting[]): boolean => {

    const start = dayjs(slotTime)
    const end = dayjs(start).add(slotDurationInMinutes, 'minute')

    const filtered = meetingsForDay.filter(meeting =>
        (meeting.startTime >= start && meeting.endTime <= end) ||
        (meeting.startTime <= start && meeting.endTime >= end) ||
        (meeting.endTime > start && meeting.endTime <= end) ||
        (meeting.startTime >= start && meeting.startTime < end))

    return filtered.length == 0
}

export { scheduleMeeting, fetchAccountMeetings, isTimeAvailable, isSlotAvailable }