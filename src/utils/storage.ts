const SIGNATURE_KEY = 'current_user_sig'
const SCHEDULES = 'meetings_scheduled'

const saveSignature = (account_address: string, signature: string) => {
  window.localStorage.setItem(
    `${SIGNATURE_KEY}:${account_address.toLowerCase()}`,
    signature
  )
}

const removeSignature = (account_address: string) => {
  window.localStorage.removeItem(
    `${SIGNATURE_KEY}:${account_address.toLowerCase()}`
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

const saveMeetingsScheduled = (account_address: string) => {
  let currentSchedules: number
  currentSchedules = parseInt(
    window.localStorage.getItem(
      `${SCHEDULES}:${account_address.toLowerCase()}`
    )!
  )

  if (!currentSchedules) {
    window.localStorage.setItem(
      `${SCHEDULES}:${account_address.toLowerCase()}`,
      `${(currentSchedules = 1)}`
    )
  } else if (currentSchedules >= 1) {
    window.localStorage.setItem(
      `${SCHEDULES}:${account_address.toLowerCase()}`,
      `${(currentSchedules = currentSchedules + 1)}`
    )
  }
}

const getMeetingsScheduled = (account_address: string) => {
  const currentSchedules = parseInt(
    window.localStorage.getItem(
      `${SCHEDULES}:${account_address.toLowerCase()}`
    )!
  )
  return currentSchedules
}

export {
  getMeetingsScheduled,
  getSignature,
  removeSignature,
  saveMeetingsScheduled,
  saveSignature,
}
