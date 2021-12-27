import { Account } from "../types/Account";

const SIGNATURE_KEY = 'current_user_sig'
const ACCOUNT = 'current_account'

const saveSignature = (account_address: string, signature: string) => {
    window.localStorage.setItem(`${SIGNATURE_KEY}:${account_address}`, signature);
}

const getSignature = (account_address: string): string | null => {
    return window.localStorage.getItem(`${SIGNATURE_KEY}:${account_address}`);
}

const storeCurrentAccount = (account: Account) => {
    window.localStorage.setItem(ACCOUNT, account.address);
}

const getCurrentAccount = (): string => {
    return window.localStorage.getItem(ACCOUNT) as string;
}

export { saveSignature, getSignature, storeCurrentAccount, getCurrentAccount }