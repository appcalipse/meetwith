import EthCrypto, { Encrypted, encryptWithPublicKey } from 'eth-crypto';
import { Account } from '../types/Account';
import { encryptContent } from './cryptography';
import { DBMeeting, DBParticipantInfo, IPFSMeetingInfo, MeetingCreationRequest, MeetingEncrypted, MeetingStatus, Participant, ParticipantType } from '../types/Meeting';
import { AccountPreferences } from '../types/Account';
import { createClient } from '@supabase/supabase-js'
import { AccountNotFoundError } from '../utils/errors';
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper';
import dayjs from 'dayjs';
import meetings from '../pages/api/meetings';

const db: any = { ready: false };

const initDB = () => {

    if (!db.ready) {
        db.supabase = createClient(process.env.NEXT_SUPABASE_URL!, process.env.NEXT_SUPABASE_KEY!)
        db.ready = true
    }

    return db
}

initDB()

const initAccountDBForWallet = async (address: string, signature: string): Promise<Account> => {

    const newIdentity = EthCrypto.createIdentity();

    const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

    const preferences: AccountPreferences = {
        availableTypes: [],
        description: ''
    }

    const path = await addContentToIPFS(preferences)
    //TODO handle ipfs error

    const { data, error } = await db.supabase
        .from('accounts')
        .insert([
            {
                address: address,
                internal_pub_key: newIdentity.publicKey,
                encoded_signature: encryptedPvtKey,
                preferences_path: path
            }
        ])

    if (error) {
        console.log(error)
        throw new Error('Account couldn\'t be created')
    }

    return data[0] as Account
}

const getAccountFromDB = async (identifier: string): Promise<Account> => {
    let response = await db.supabase.from('accounts').select().eq('address', identifier)

    if (response.error || response.data.length == 0) {
        response = await db.supabase.from('accounts').select().eq('ens', identifier)
    }

    if (!response.error && response.data.length > 0) {
        const account = response.data[0] as Account
        account.preferences = (await fetchContentFromIPFS(account.preferences_path)) as AccountPreferences
        return account
    }

    throw new AccountNotFoundError(identifier)
}

const getMeetingsForAccount = async (identifier: string, start?: Date, end?: Date): Promise<DBMeeting[]> => {
    const account = await getAccountFromDB(identifier)

    const { data, error } = await db.supabase.from('participant_info').select(
        `
        participant,
        meeting_info_path,
        meetings (
          start,
          end
        )
      `
    ).eq('participant', account.address)
        .gte('meeting.start', start ? start : 0)
        .lte('meeting.end', end ? end : 99999999999)

    // //TODO: handle error


    return data
}

const getMeetingFromDB = async (meeting_id: string, participant_address: string): Promise<MeetingEncrypted> => {

    const { data, error } = await db.supabase.from('meetings').select(`
        *,
        participant_info (
            *
        )
    `).eq('id', meeting_id)

    const dbMeeting = data[0] as DBMeeting
    const meeting: MeetingEncrypted = {
        id: dbMeeting.id!,
        startTime: dayjs(dbMeeting.start),
        endTime: dayjs(dbMeeting.end),
        participants: []
    }

    const participants: Participant[] = []

    for (const participant of data[0].participant_info) {
        const ipfsContent: IPFSMeetingInfo = await fetchContentFromIPFS(participant.meeting_info_path!) as IPFSMeetingInfo
        participants.push({
            address: participant.participant,
            type: ipfsContent.type,
            status: ipfsContent.status
        })
        if (participant.participant == participant_address) {
            meeting.content = ipfsContent.content
        }
    };

    meeting.participants = participants

    return meeting
}

const saveMeeting = async (meeting: MeetingCreationRequest): Promise<MeetingEncrypted> => {

    const { data, error } = await db.supabase.from('meetings').insert([
        {
            start: meeting.start,
            end: meeting.end
        }
    ])

    //TODO: handle error
    if (error) {
        console.error(error)
    }

    const meeting_id = data[0].id

    let contentToReturn: Encrypted | undefined

    await meeting.participants.forEach(async (participantInfo) => {

        const account = await getAccountFromDB(participantInfo.participant)

        const content = meeting.content ? await encryptWithPublicKey(account.internal_pub_key, meeting.content) : undefined
        if (participantInfo.type == ParticipantType.Scheduler) {
            contentToReturn = content
        }

        const ipfsInfo: IPFSMeetingInfo = {
            created_at: new Date(),
            status: participantInfo.type === ParticipantType.Scheduler ? MeetingStatus.Accepted : MeetingStatus.Pending,
            type: participantInfo.type,
            content,
            change_history_paths: []
        }

        const path = await addContentToIPFS(ipfsInfo)
        const { data, error } = await db.supabase.from('participant_info').insert([
            {
                meeting_id,
                participant: participantInfo.participant,
                meeting_info_path: path
            }
        ])

        //TODO: handle error

    })

    const result: MeetingEncrypted = {
        id: meeting_id,
        participants: meeting.participants.map((participantInfo) => {
            return {
                address: participantInfo.participant,
                type: participantInfo.type,
                status: participantInfo.status
            }
        }),
        startTime: dayjs(meeting.start),
        endTime: dayjs(meeting.end),
        content: contentToReturn
    }

    return result
}

const saveEmailToDB = async (email: string): Promise<boolean> => {
    const { data, error } = await db.supabase.from('emails').upsert([
        {
            email
        }
    ])

    console.log(data)
    console.log(error)
    if (!error) {
        return true
    }

    return false
}

export { initDB, initAccountDBForWallet, saveMeeting, getAccountFromDB, getMeetingsForAccount, getMeetingFromDB, saveEmailToDB }