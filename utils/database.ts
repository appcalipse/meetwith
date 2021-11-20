import * as IPFS from 'ipfs'
import OrbitDB from 'orbit-db'
import EthCrypto, { encryptWithPublicKey } from 'eth-crypto';
import { Account, PremiumAccount } from '../types/Account';
import { encryptContent } from './cryptography';
import { DBMeeting } from '../types/Meeting';
import DocumentStore from 'orbit-db-docstore';
import { signDefaultMessage } from './user_manager';
import { v4 as uuidv4 } from 'uuid';
import { UserNotFoundError } from '../utils/errors'

const isProduction = process.env.NODE_ENV === 'production';

const db: any = { ready: false };

const getIPFS = async () => {
    //const ipfsOptions = { repo : './ipfs', }
    return await IPFS.create({ repo: './ipfs/alo2' })
}

const initDB = async () => {

    if (!db.ready) {
        const orbitdb = await OrbitDB.createInstance(await getIPFS())

        db.main = orbitdb
        db.ready = true
    }

    return
}

const getAccountsDB = async (): Promise<DocumentStore<Account>> => {
    const accountsDB = await db.main.docs('application.accounts', { accessController: { write: ['*'] } })
    await accountsDB.load()
    return accountsDB;
}

const initAccountDBForWallet = async (wallet: string): Promise<Account> => {
    const newIdentity = EthCrypto.createIdentity();

    const signature = await signDefaultMessage(wallet)

    const accountMeetingsDB: DocumentStore<DBMeeting> = await db.main.docs(`application.meetings.${uuidv4()}`, { accessController: { write: ['*'] } })

    const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

    const account: Account = {
        _id: uuidv4(),
        address: wallet,
        pubKey: newIdentity.publicKey,
        encodedSignature: encryptedPvtKey,
        meetingsDBAddress: accountMeetingsDB.id,
    }

    const accountsDB = await getAccountsDB()

    await accountsDB.put(account, { pin: isProduction })
    const dbUser = accountsDB.get(account._id)
    accountsDB.close()
    return (dbUser as unknown) as Account
}

const getAccount = async (identifier: string): Promise<Account> => {
    const accountsDB = await getAccountsDB()
    let dbUser = await accountsDB.query((account: Account) => ((account as PremiumAccount).ens && (account as PremiumAccount).ens === identifier))
    accountsDB.close()
    if (dbUser.length == 0) {
        dbUser = await accountsDB.query((account: Account) => account.address === identifier)
        if (dbUser.length == 0) {
            throw new UserNotFoundError(identifier)
        }
    }
    return dbUser[0] as Account
}

const getMeetingDBForUser = async (identifier: string): Promise<DocumentStore<DBMeeting>> => {
    const user = await getAccount(identifier)
    try {
        const accountMeetingsDB = await db.main.open(user.meetingsDBAddress)
        await accountMeetingsDB.load()
        return accountMeetingsDB;
    } catch (e) {
        throw new Error(`Could not open account meetings db for account with identifier ${identifier}`)
    }
}

const getMeeting = async (accountAddress: string, meetingHash: String): Promise<DBMeeting> => {
    const accountMeetingsDB = await getMeetingDBForUser(accountAddress)
    const meeting = (accountMeetingsDB.get(meetingHash) as unknown) as DBMeeting //maybe a typescript definition error on orbitdb
    accountMeetingsDB.close()
    return meeting
}

const saveMeeting = async (meeting: DBMeeting, plainContent?: string): Promise<boolean> => {
    const targetAccount = await getAccount(meeting.target)
    const targetAccountMeetingsDB = await getMeetingDBForUser(meeting.target)
    await targetAccountMeetingsDB.put({ ...meeting, content: plainContent ? await encryptWithPublicKey(targetAccount.pubKey, plainContent) : '' }, { pin: isProduction })
    targetAccountMeetingsDB.close()

    const sourceAccount = await getAccount(meeting.source)
    const sourceAccountMeetingsDB = await getMeetingDBForUser(meeting.source)
    await sourceAccountMeetingsDB.put({ ...meeting, content: plainContent ? await encryptWithPublicKey(sourceAccount.pubKey, plainContent) : '' }, { pin: isProduction })
    sourceAccountMeetingsDB.close()

    return true
}

export { initDB, initAccountDBForWallet, getMeetingDBForUser, getMeeting, getAccountsDB, saveMeeting, getAccount }