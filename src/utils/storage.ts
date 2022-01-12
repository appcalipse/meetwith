import { Account } from '../types/Account'

const SIGNATURE_KEY = 'current_user_sig'
const ACCOUNT = 'current_account'

const saveSignature = (account_address: string, signature: string) => {
  window.localStorage.setItem(
    `${SIGNATURE_KEY}:${account_address.toLowerCase()}`,
    signature
  )
}

const getSignature = (account_address: string): string | null => {
  if (account_address) {
    return window.localStorage.getItem(
      `${SIGNATURE_KEY}:${account_address.toLowerCase()}`
    )
  } else {
    return null
  }
}

const storeCurrentAccount = (account: Account) => {
  window.localStorage.setItem(ACCOUNT, account.address.toLowerCase())
}

const getCurrentAccount = (): string => {
  return window.localStorage.getItem(ACCOUNT) as string
}

export { saveSignature, getSignature, storeCurrentAccount, getCurrentAccount }
