import * as IPFS from 'ipfs'
import OrbitDB from 'orbit-db'
import EthCrypto from 'eth-crypto';
import { RegisteredUser, User } from '../types/User';
import { signDefaultMessage } from './wallet';
import { encryptContent } from './cryptography';
import { saveSignature } from './storage';

const db: any = { ready: false };

const getIPFS = async () => {
    //const ipfsOptions = { repo : './ipfs', }
    return await IPFS.create({ repo: './ipfs/new' })
}

const initDB = async () => {

    if (!db.ready) {
        const orbitdb = await OrbitDB.createInstance(await getIPFS())

        db.main = orbitdb
        db.ready = true
    }

    return
}

const initUserDBForWallet = async (wallet: string): Promise<RegisteredUser> => {
    const newIdentity = EthCrypto.createIdentity();

    const user: User = {
        address: wallet,
        pubKey: newIdentity.publicKey,
    }
    const signature = await signDefaultMessage(user)

    const encryptedPvtKey = encryptContent(signature, newIdentity.privateKey)

    const registeredUser: RegisteredUser = {
        ...user,
        pvtKey: encryptedPvtKey
    }

    const accountsDB = await getAccountsDB()

    await accountsDB.put(wallet, registeredUser)
    const dbUser = accountsDB.get(wallet)
    accountsDB.close()
    return dbUser
}

const getAccountsDB = async () => {
    const accountsDB = await db.main.keyvalue('application.accounts')
    await accountsDB.load()
    return accountsDB;
}

const getMeetingDBForUser = async (user: User) => {
    const userMeetinsDB = await db.main.docs(`application.meetings.${user.address}`)
    await userMeetinsDB.load()
    return userMeetinsDB;
}

const getMeeting = async (user: User, hash: String): Promise<string> => {
    const userDB = await getMeetingDBForUser(user)
    const meeting = await (userDB).get(hash)
    userDB.close()
    return meeting
}

export { initDB, initUserDBForWallet, getMeetingDBForUser, getMeeting, db, getAccountsDB }