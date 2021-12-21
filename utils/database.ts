import EthCrypto, { Encrypted } from 'eth-crypto';
import { Account, AccountPreferences, MeetingType, SpecialDomainType } from '../types/Account';
import { encryptContent } from './cryptography';
import { DBSlot, DBSlotEnhanced, MeetingCreationRequest, ParticipantBaseInfo, ParticipantInfo, ParticipantType, ParticipationStatus } from '../types/Meeting';
import { createClient } from '@supabase/supabase-js'
import { AccountNotFoundError, MeetingNotFoundError, MeetingWithYourselfError, TimeNotAvailableError } from '../utils/errors';
import { addContentToIPFS, fetchContentFromIPFS } from './ipfs_helper';
import { generateDefaultAvailabilities, generateDefaultMeetingType } from './calendar_manager';
import { validate } from 'uuid';
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
        availableTypes: [generateDefaultMeetingType()],
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

const updateAccountPreferences = async (account: Account): Promise<Account> => {

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

    const query = validate(identifier) ? `id.eq.${identifier}` : `address.eq.${identifier},special_domain.eq.${identifier},internal_pub_key.eq.${identifier}`

    const {data, error} = await db.supabase.from('accounts').select('nonce')
    .or(query)

    if (!error && data.length > 0) {
        return data[0].nonce as number
    }

    throw new AccountNotFoundError(identifier)
}


const getAccountFromDB = async (identifier: string): Promise<Account> => {

    const query = validate(identifier) ? `id.eq.${identifier}` : `address.eq.${identifier},special_domain.eq.${identifier},internal_pub_key.eq.${identifier}`

    const {data, error} = await db.supabase.from('accounts').select()
    .or(query)

    if (!error && data.length > 0) {
        let account = data[0] as Account
        account.preferences = (await fetchContentFromIPFS(account.preferences_path)) as AccountPreferences
        return account
    } else {
        console.log(error)
    }

    throw new AccountNotFoundError(identifier)
}

const getSlotsForAccount = async (identifier: string, start?: Date, end?: Date, limit?: number, offset?: number): Promise<DBSlot[]> => {
    const account = await getAccountFromDB(identifier)

    const _start = start ? start.toISOString() : "1970-01-01"
    const _end = end ? end.toISOString() : "2500-01-01"

    const { data, error } = await db.supabase.from('slots').select(
    ).eq('account_pub_key', account.internal_pub_key)
    .or(`and(start.gte.${_start},end.lte.${_end}),and(start.lte.${_start},end.gte.${_end}),and(start.gt.${_start},end.lte.${_end}),and(start.gte.${_start},end.lt.${_end})`)
    .range(offset || 0, (offset || 0) + (limit ? (limit - 1) : 99999999999999999))
    .order('start')

    if (error) {
        console.log(error)
    // //TODO: handle error
    }

    return data || []
}

const getSlotsForDashboard = async (identifier: string, end: Date, limit: number, offset: number): Promise<DBSlot[]> => {
    const account = await getAccountFromDB(identifier)

    const _end = end.toISOString()

    const { data, error } = await db.supabase.from('slots').select(
    ).eq('account_pub_key', account.internal_pub_key)
    .gte('end', _end)
    .range(offset, offset + limit)
    .order('start')

    if (error) {
        console.log(error)
    // //TODO: handle error
    }

    return data || []
}

const isSlotFree = async (account_identifier: string, start: Date, end: Date, meetingTypeId: string): Promise<boolean> => {
    const account = await getAccountFromDB(account_identifier)
    
    const minTime = account.preferences?.availableTypes.filter(mt => mt.id === meetingTypeId)
    
    if(minTime && minTime.length > 0) {
        if(!minTime[0].minAdvanceTime || dayjs().add(minTime[0].minAdvanceTime, 'minute').isAfter(start)) {
            return false
        }    
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

const saveMeeting = async (meeting: MeetingCreationRequest, requesterId: string): Promise<DBSlotEnhanced> => {

    //TODO - validate meeting can indeed be created, meaning, it is not conflicting

    if((new Set(meeting.participants_mapping.map(p => p.account_id))).size !== meeting.participants_mapping.length) {
        //means there are duplicate participants
        throw new MeetingWithYourselfError()
    }

    const slots = []
    let meetingResponse = {} as DBSlotEnhanced
    let index = 0
    let i = 0

    for(let participant of meeting.participants_mapping) {

        if(await !isSlotFree(participant.account_id, new Date(meeting.start), new Date(meeting.end), meeting.meetingTypeId)) {
          throw new TimeNotAvailableError()
        }

        const account = await getAccountFromDB(participant.account_id)
        
        const path = await addContentToIPFS(participant.privateInfo)

        const dbSlot: DBSlot = {
            id: participant.slot_id,
            start: meeting.start,
            end: meeting.end,
            account_pub_key: account.internal_pub_key,
            meeting_info_file_path: path
        }

        slots.push(dbSlot)

        if(participant.account_id === requesterId) {
            index = i
            meetingResponse = {...dbSlot, meeting_info_encrypted: participant.privateInfo}
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

export { initDB, initAccountDBForWallet, saveMeeting, getAccountFromDB, getSlotsForAccount, getSlotsForDashboard, getMeetingFromDB, saveEmailToDB, isSlotFree, updateAccountPreferences, getAccountNonce}