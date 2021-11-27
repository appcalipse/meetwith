// import * as IPFS from 'ipfs'
// import OrbitDB from 'orbit-db'
// import EthCrypto, { encryptWithPublicKey } from 'eth-crypto';
// import { Account, PremiumAccount } from '../types/Account';
// import { encryptContent } from './cryptography';
// import { DBMeeting } from '../types/Meeting';
// import DocumentStore from 'orbit-db-docstore';
// import { signDefaultMessage } from './user_manager';
// import KeyValueStore from 'orbit-db-kvstore';
// import { AccountPreferences } from '../types/Account';
// import { createClient } from '@supabase/supabase-js'

// const isProduction = process.env.NODE_ENV === 'production';

// const db: any = { ready: false };

// const getIPFS = async (path: string) => {
//     return await IPFS.create({ repo: path })
// }

// const initDB = () => {

//     if (!db.ready) {
//         db.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!)
//         db.ready = true

//         // (window as any).LOG = 'orbit*'
//         // const orbitdb = await OrbitDB.createInstance(await getIPFS('./ipfs/default'))

//         // db.main = orbitdb
//     }

//     return db
// }

// const getAccountsDB = async (): Promise<DocumentStore<Account>> => {
//     const accountsDB = await db.main.docs('application.accounts', { accessController: { write: ['*'] } })
//     await accountsDB.load()
//     return accountsDB;
// }

// const getConfigsDB = async (): Promise<KeyValueStore<AccountPreferences>> => {
//     const configsDB = await db.main.kvstore('application.configs', { accessController: { write: ['*'] } })
//     await configsDB.load()
//     return configsDB;
// }

// const initAccountDBForWallet = async (wallet: string): Promise<Account> => {

//     const newIdentity = EthCrypto.createIdentity();

//     const signature = await signDefaultMessage(wallet)

//     // db.main.stop()

//     // db.main = await OrbitDB.createInstance(await getIPFS('./ipfs/personal'), { identity })

//     // const accountMeetingsDB: DocumentStore<DBMeeting> = await db.main.docs(`application.meetings.${uuidv4()}`)

//     // const preferencesDB = await getConfigsDB()
//     // const configId = await preferencesDB.put(accountId, { availableTypes: [] }, { pin: isProduction })
//     const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

//     const { data, error } = await db.supabase
//         .from('accounts')
//         .insert([
//             {
//                 address: wallet,
//                 pub_key: newIdentity.publicKey,
//                 encoded_signature: encryptedPvtKey
//             }
//         ])

//     if (error) {
//         console.log(error)
//         throw new Error('Account couldn\'t be created')
//     }

//     // const account: Account = {
//     //     address: wallet,
//     //     pubKey: newIdentity.publicKey,
//     //     encodedSignature: encryptedPvtKey,

//     // }

//     // const accountsDB = await getAccountsDB()

//     // await accountsDB.put(account, { pin: isProduction })
//     // const dbUser = accountsDB.get(account._id)
//     // accountsDB.close()
//     // return dbUser[0] as Account
//     return data[0] as Account
// }

// const getAccount = async (identifier: string): Promise<Account> => {
//     const accountsDB = await getAccountsDB()
//     let dbUser = await accountsDB.query((account: Account) => ((account as PremiumAccount).ens && (account as PremiumAccount).ens === identifier))
//     accountsDB.close()
//     if (dbUser.length == 0) {
//         dbUser = await accountsDB.query((account: Account) => account.address === identifier)
//         if (dbUser.length == 0) {
//             throw new UserNotFoundError(identifier)
//         }
//     }
//     return dbUser[0] as Account
// }

// const getAccountConfig = async (accountId: string): Promise<AccountPreferences> => {
//     const configDB = await getConfigsDB()
//     return configDB.get(accountId)
// }

// const getMeetingDBForUser = async (identifier: string): Promise<DocumentStore<DBMeeting>> => {
//     const user = await getAccount(identifier)
//     try {
//         const accountMeetingsDB = await db.main.open(user.configs.meetingsDBAddress)
//         await accountMeetingsDB.load()
//         return accountMeetingsDB;
//     } catch (e) {
//         console.error(e)
//         throw new Error(`Could not open account meetings db for account with identifier ${identifier}`)
//     }
// }

// const getMeeting = async (accountAddress: string, meetingHash: String): Promise<DBMeeting> => {
//     const accountMeetingsDB = await getMeetingDBForUser(accountAddress)
//     const meeting = (accountMeetingsDB.get(meetingHash) as unknown) as DBMeeting //maybe a typescript definition error on orbitdb
//     accountMeetingsDB.close()
//     return meeting
// }

// const saveMeeting = async (meeting: DBMeeting, plainContent?: string): Promise<boolean> => {
//     const targetAccount = await getAccount(meeting.target)
//     const targetAccountMeetingsDB = await getMeetingDBForUser(meeting.target)
//     await targetAccountMeetingsDB.put({ ...meeting, content: plainContent ? await encryptWithPublicKey(targetAccount.pubKey, plainContent) : '' }, { pin: isProduction })
//     targetAccountMeetingsDB.close()

//     const sourceAccount = await getAccount(meeting.source)
//     const sourceAccountMeetingsDB = await getMeetingDBForUser(meeting.source)
//     await sourceAccountMeetingsDB.put({ ...meeting, content: plainContent ? await encryptWithPublicKey(sourceAccount.pubKey, plainContent) : '' }, { pin: isProduction })
//     sourceAccountMeetingsDB.close()

//     return true
// }

// export { initDB, initAccountDBForWallet, getMeetingDBForUser, getMeeting, getAccountsDB, saveMeeting, getAccount }