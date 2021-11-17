import { RegisteredUser } from '../models/User';
import { getAccountsDB, initUserDBForWallet } from './database';

const createOrFetchUser = async (wallet: string): Promise<RegisteredUser> => {

    const accountsDB = await getAccountsDB()
    let account = accountsDB.get(wallet)
    accountsDB.close()

    if (!account) {
        account = await initUserDBForWallet(wallet)
    }

    return account
}

export { createOrFetchUser }