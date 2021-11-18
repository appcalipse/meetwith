import { Dayjs } from 'dayjs';
import { decryptWithPrivateKey, Encrypted, encryptWithPublicKey } from 'eth-crypto';
import { v4 as uuidv4 } from 'uuid';
import { DBMetting } from "../types/Meeting";
import { RegisteredUser, User } from "../types/User";
import { decryptContent } from './cryptography';
import { getMeetingDBForUser } from "./database";
import { getSignature } from './storage';

const scheduleMeeting = async (sourceUser: User, targetUser: User, startTime: Dayjs, endTime: Dayjs, meetingContent?: string): Promise<DBMetting> => {
    const userMeetingsDB = await getMeetingDBForUser(targetUser);

    const meeting = { _id: uuidv4(), source: sourceUser.address, target: targetUser.address, startTime: startTime.valueOf(), endTime: endTime.valueOf(), content: meetingContent ? await encryptWithPublicKey(targetUser.pubKey, meetingContent) : undefined }

    if (await isTimeAvailable(targetUser, meeting)) {
        await userMeetingsDB.put(meeting)
    } else {
        throw new Error('Time is not available');
    }
    userMeetingsDB.close()

    return meeting
}

const fetchUserMeetings = async (user: RegisteredUser, from?: Date, to?: Date): Promise<DBMetting[]> => {
    const userMeetingsDB = await getMeetingDBForUser(user);
    const response = await userMeetingsDB.query((event: DBMetting) => event.startTime >= (from ? from : 0) && event.endTime <= (to ? to : 9999999999999999))
    userMeetingsDB.close()

    return await Promise.all(response.map(async (meeting: DBMetting) => { return { ...meeting, content: (meeting.content ? await getContentFromEncrypted(user, getSignature(user)!, meeting.content) : '') } }))
}

const getContentFromEncrypted = async (user: RegisteredUser, signature: string, encrypted: Encrypted): Promise<string> => {
    const pvtKey = decryptContent(signature, user.pvtKey)
    return await decryptWithPrivateKey(pvtKey, encrypted)
}

const isTimeAvailable = async (targetUser: User, meeting: DBMetting): Promise<boolean> => {

    const userMeetingsDB = await getMeetingDBForUser(targetUser);
    const meetings = await userMeetingsDB.query((event: DBMetting) =>
        (event.startTime < meeting.startTime.valueOf() && event.endTime >= meeting.endTime.valueOf()) ||
        (event.startTime < meeting.endTime.valueOf() && event.startTime >= meeting.startTime.valueOf()) ||
        (event.endTime > meeting.startTime.valueOf() && event.endTime < meeting.endTime.valueOf()) ||
        (event.startTime > meeting.startTime.valueOf() && event.endTime <= meeting.endTime.valueOf()))

    console.log(meetings)

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

export { scheduleMeeting, fetchUserMeetings }