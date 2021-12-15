import EthCrypto, { Encrypted, encryptWithPublicKey } from 'eth-crypto';
import { Account, AccountPreferences, MeetingType } from '../types/Account';
import { encryptContent } from './cryptography';
import { DBSlot, DBSlotEnhanced, IPFSMeetingInfo, MeetingCreationRequest, ParticipantBaseInfo, ParticipantInfo, ParticipantType, ParticipationStatus } from '../types/Meeting';
import { createClient } from '@supabase/supabase-js'
import { AccountNotFoundError, MeetingNotFoundError, MeetingWithYourselfError } from '../utils/errors';
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper';
import { generateMeetingUrl } from './meeting_call_helper';
import { generateDefaultAvailabilities, generateDefaultMeetingType } from './calendar_manager';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const db: any = { ready: false };

const initDB = () => {

    if (!db.ready) {
        db.supabase = createClient(process.env.NEXT_SUPABASE_URL!, process.env.NEXT_SUPABASE_KEY!)
        db.ready = true
    }

    return db
}

initDB()

const initAccountDBForWallet = async (address: string, signature: string, timezone: string, nonce: number): Promise<Account> => {

    const newIdentity = EthCrypto.createIdentity();

    const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

    const { data, error } = await db.supabase
        .from('accounts')
        .insert([
            {
                address: address,
                internal_pub_key: newIdentity.publicKey,
                encoded_signature: encryptedPvtKey,
                preferences_path: "",
                nonce
            }
        ])

    if (error) {
        console.error(error)
        throw new Error('Account couldn\'t be created')
    }

    const availabilities = generateDefaultAvailabilities()

    const preferences: AccountPreferences = {
        availableTypes: [generateDefaultMeetingType(data[0].id)],
        description: '',
        availabilities,
        socialLinks: [],
        timezone 
    }

    const path = await addContentToIPFS(preferences)
    //TODO handle ipfs error

    const responsePrefs = await db.supabase
        .from('accounts')
        .update(
            {
                preferences_path: path
            }
        )
        .match({ id: data[0].id })


    if(responsePrefs.error) {
        console.log(responsePrefs.error)
        //TODO: handle error
    }

    const account = responsePrefs.data[0] as Account
    account.preferences = preferences

    return account
}

const updateAccount = async (account: Account): Promise<Account> => {

    const path = await addContentToIPFS(account.preferences!)
    //TODO handle ipfs error

    const {data, error} = await db.supabase
        .from('accounts')
        .update(
            {
                preferences_path: path
            }
        )
        .match({ id: account.id })


    if(error) {
        console.log(error)
        //TODO: handle error
    }

    return {...data[0],
        preferences: account.preferences
    } as Account
}

const getAccountNonce = async (identifier: string): Promise<number> => {
    const {data, error} = await db.supabase.from('accounts').select('nonce')
    .or(`address.eq.${identifier},special_domain.eq.${identifier},internal_pub_key.eq.${identifier}`)

    if (!error && data.length > 0) {
        return data[0].nonce as number
    }

    throw new AccountNotFoundError(identifier)
}


const getAccountFromDB = async (identifier: string): Promise<Account> => {
    const {data, error} = await db.supabase.from('accounts').select()
    .or(`address.eq.${identifier},special_domain.eq.${identifier},internal_pub_key.eq.${identifier}`)

    if (!error && data.length > 0) {
        const account = data[0] as Account
        account.preferences = (await fetchContentFromIPFS(account.preferences_path)) as AccountPreferences
        return account
    }

    throw new AccountNotFoundError(identifier)
}

const getSlotsForAccount = async (identifier: string, start?: Date, end?: Date): Promise<DBSlot[]> => {
    const account = await getAccountFromDB(identifier)

    const _start = start ? start.toDateString() : "1970-01-01"
    const _end = end ? end.toDateString() : "2500-01-01"

    const { data, error } = await db.supabase.from('slots').select(
    ).eq('account_pub_key', account.internal_pub_key)
    .or(`and(start.gte.${_start},end.lte.${_end}),and(start.lte.${_start},end.gte.${_end}),and(start.gt.${_start},end.lte.${_end}),and(start.gte.${_start},end.lt.${_end})`)

    if (error) {
    // //TODO: handle error
    }

    return data || []
}

const isSlotFree = async (account_identifier: string, meetingTypeId: string, start: Date, end: Date): Promise<boolean> => {
    const account = getAccountFromDB(account_identifier)
    const minTime = (await account).preferences?.availableTypes.filter(mt => mt.id === meetingTypeId)[0].minAdvanceTime
    if(!minTime || dayjs().add(minTime, 'minute').isAfter(start)) {
        return false
    }
    return await (await getSlotsForAccount(account_identifier, start, end)).length == 0
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

    //TODO - validate meeting can indeed be created, meaninig, it is not conflicting

    const schedulerId = meeting.participants.find(p => p.type == ParticipantType.Scheduler)!.account_identifier
    const ownerId = meeting.participants.find(p => p.type == ParticipantType.Owner)!.account_identifier

    if(schedulerId === ownerId) {
        throw new MeetingWithYourselfError()
    }

    const participantsInfo: ParticipantInfo[] = meeting.participants.map((participant: ParticipantBaseInfo) => {
        return {
            account_identifier: participant.account_identifier,
            type: participant.type,
            status: participant.type === ParticipantType.Scheduler ? ParticipationStatus.Accepted : ParticipationStatus.Pending,
            slot_id: uuidv4()
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

        if(await isSlotFree(participant.account_identifier, meeting.meetingTypeId, meeting.start, meeting.end)) {
        
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

export { initDB, initAccountDBForWallet, saveMeeting, getAccountFromDB, getSlotsForAccount, getMeetingFromDB, saveEmailToDB, isSlotFree, updateAccount, getAccountNonce}