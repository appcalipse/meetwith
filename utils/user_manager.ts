import { RegisteredUser } from '../models/User';
import { getAccountsDB, initUserDBForWallet } from './database';

const createOrFetchUser = async (wallet: string): Promise<RegisteredUser> => {

    const accountsDB = await getAccountsDB()
    let account = accountsDB.get(wallet)

    if (!account) {
        account = await initUserDBForWallet(wallet)
    }
    accountsDB.close()

    return account
}

export { createOrFetchUser }