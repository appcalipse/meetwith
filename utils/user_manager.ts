import { RegisteredUser } from '../types/User';
import { getAccountsDB, initUserDBForWallet } from './database';
import { getSignature } from './storage';
import { signDefaultMessage } from './wallet';

const createOrFetchUser = async (wallet: string): Promise<RegisteredUser> => {

    const accountsDB = await getAccountsDB()
    let account = accountsDB.get(wallet)
    accountsDB.close()

    if (!account) {
        account = await initUserDBForWallet(wallet)
    }

    const signature = getSignature(account)

    if (!signature) {
        await signDefaultMessage(account)
    }

    return account
}

export { createOrFetchUser }