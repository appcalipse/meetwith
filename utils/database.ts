import EthCrypto, { Encrypted, encryptWithPublicKey } from 'eth-crypto';
import { Account } from '../types/Account';
import { encryptContent } from './cryptography';
import { DBSlot, DBSlotEnhanced, IPFSMeetingInfo, MeetingCreationRequest, ParticipantBaseInfo, ParticipantInfo, ParticipantType, ParticipationStatus } from '../types/Meeting';
import { AccountPreferences } from '../types/Account';
import { createClient } from '@supabase/supabase-js'
import { AccountNotFoundError, MeetingNotFoundError } from '../utils/errors';
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper';
import dayjs from 'dayjs';
import { randomUUID } from 'crypto';
import { generateMeetingUrl } from './meeting_url_heper';

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

    const preferences = {
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
    const {data, error} = await db.supabase.from('accounts').select()
    .or(`address.eq.${identifier},special_domain.eq.${identifier},internal_pub_key.eq.${identifier}`)

    console.log(error)
    if (!error && data.length > 0) {
        const account = data[0] as Account
        //account.preferences = (await fetchContentFromIPFS(account.preferences_path)) as AccountPreferences
        return account
    }

    throw new AccountNotFoundError(identifier)
}

const getMeetingsForAccount = async (identifier: string, start?: Date, end?: Date): Promise<DBSlotEnhanced[]> => {
    const account = await getAccountFromDB(identifier)

    const { data, error } = await db.supabase.from('participant_info').select(
        `
        participant,
        meeting_info_file_path,
        meetings (
          start,
          end
        )
      `
    ).eq('participant', account.address)
        .gte('meeting.start', start ? start : 0)
        .lte('meeting.end', end ? end : 99999999999)

    // //TODO: handle error


    return data || []
}

const getMeetingFromDB = async (slot_id: string): Promise<DBSlotEnhanced> => {

    const { data, error } = await db.supabase.from('slots').select().eq('id', slot_id)

    if(error) {
        // todo handle error
    }
    
    if(data.length == 0) {
        throw new MeetingNotFoundError(slot_id)
    }

    const dbMeeting = data[0] as DBSlot
    const meeting: DBSlotEnhanced = {
        ...dbMeeting,
        meeting_info_encrypted: await fetchContentFromIPFS(dbMeeting.meeting_info_file_path) as Encrypted,
    }

    return meeting
}

const saveMeeting = async (meeting: MeetingCreationRequest): Promise<DBSlotEnhanced> => {

    const participantsInfo: ParticipantInfo[] = meeting.participants.map((participant: ParticipantBaseInfo) => {

        return {
            account_identifier: participant.account_identifier,
            type: participant.type,
            status: participant.type === ParticipantType.Scheduler ? ParticipationStatus.Accepted : ParticipationStatus.Pending,
            slot_id: randomUUID()
        }
    })

    const slots = []
    let meetingResponse = {} as DBSlotEnhanced
    let index = 0
    let i = 0

    for(let participant of participantsInfo) {

        const ipfsInfo: IPFSMeetingInfo = {
            created_at: new Date(),
            participants: participantsInfo,
            content: meeting.content,
            meeting_url: generateMeetingUrl(meeting),
            change_history_paths: []
        }

        const account = await getAccountFromDB(participant.account_identifier)

        const meetingInfoEncrypted = await encryptWithPublicKey(account.internal_pub_key, JSON.stringify(ipfsInfo))
        
        const path = await addContentToIPFS(meetingInfoEncrypted)

        const dbSlot: DBSlot = {
            id: participant.slot_id,
            start: meeting.start,
            end: meeting.end,
            account_pub_key: account.internal_pub_key,
            meeting_info_file_path: path
        }

        slots.push(dbSlot)

        if(participant.type === ParticipantType.Scheduler) {
            index = i
            meetingResponse = {...dbSlot, meeting_info_encrypted: meetingInfoEncrypted}
        }
        i++
    }
    
    const { data, error } = await db.supabase.from('slots').insert(
        slots
    )

    //TODO: handle error
    if (error) {
        console.error(error)
    }

    meetingResponse.id = data[index].id
    
    return meetingResponse
}

const saveEmailToDB = async (email: string): Promise<boolean> => {
    const { data, error } = await db.supabase.from('emails').upsert([
        {
            email
        }
    ])

    if (!error) {
        return true
    }

    return false
}

export { initDB, initAccountDBForWallet, saveMeeting, getAccountFromDB, getMeetingsForAccount, getMeetingFromDB, saveEmailToDB }