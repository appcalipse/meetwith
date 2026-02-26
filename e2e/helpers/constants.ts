export const DEFAULT_MESSAGE = (nonce: number) =>
  `Welcome to Meet with Wallet!\n\nPlease sign this message to prove you are the owner of your account and enable your data to be encrypted and private.\n\nDon't worry, no actual transaction, gas or assets will be used for it.\n\nYour unique number is ${nonce}`

export const AUTH_STATE_PATH = 'e2e/.auth/user.json'
export const TEST_DATA_PATH = 'e2e/.auth/test-data.json'

export const TEST_MEETING_TITLE = 'E2E Test Meeting'
export const TEST_MEETING_TITLE_EDITED = 'E2E Test Meeting (edited)'
export const TEST_TIMEZONE = 'UTC'
