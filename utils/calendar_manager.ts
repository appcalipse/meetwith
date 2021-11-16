import { decryptWithPrivateKey, Encrypted, encryptWithPublicKey } from 'eth-crypto';
import { v4 as uuidv4 } from 'uuid';
import { DBMetting } from "../models/Meeting";
import { RegisteredUser, User } from "../models/User";
import { decryptContent } from './cryptography';
import { getMeetingDBForUser } from "./database";

const scheduleMeeting = async (sourceUser: User, targetUser: User, startTime: Date, endTime: Date, meetingContent?: string): Promise<DBMetting> => {
    const userMeetingsDB = await getMeetingDBForUser(targetUser);

    const meeting = { _id: uuidv4(), source: sourceUser.address, target: targetUser.address, startTime: startTime.getTime(), endTime: endTime.getTime(), content: meetingContent ? await encryptWithPublicKey(targetUser.pubKey, meetingContent) : undefined }

    userMeetingsDB.put(meeting)
    userMeetingsDB.close()

    return meeting
}

const fetchUserMeetings = async (user: RegisteredUser, from?: Date, to?: Date): Promise<DBMetting[]> => {
    const userMeetingsDB = await getMeetingDBForUser(user);
    const response = await userMeetingsDB.query((event: DBMetting) => event.startTime >= (from ? from : 0) && event.endTime <= (to ? to : 9999999999999999))
    userMeetingsDB.close()

    return await Promise.all(response.map(async (meeting: DBMetting) => { return { ...meeting, content: (meeting.content ? await getContentFromEncrypted(user, (window as any).signature, meeting.content) : '') } }))
}

const getContentFromEncrypted = async (user: RegisteredUser, signature: string, encrypted: Encrypted): Promise<string> => {
    const pvtKey = decryptContent(signature, user.pvtKey)
    return await decryptWithPrivateKey(pvtKey, encrypted)
}


export { scheduleMeeting, fetchUserMeetings }