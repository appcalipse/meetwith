const SIGNATURE_KEY = 'current_user_sig'
const SCHEDULES = 'meetings_scheduled'
const NOTIFICATION = 'group_notification'
const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
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

const saveNotificationTime = (account_address?: string) => {
  if (!account_address) return
  window.localStorage.setItem(
    `${NOTIFICATION}:${account_address.toLowerCase()}`,
    String(Date.now() + ONE_DAY_IN_MILLISECONDS)
  )
}
const getNotificationTime = (account_address?: string): number | null => {
  if (account_address) {
    return parseInt(
      window.localStorage.getItem(
        `${NOTIFICATION}:${account_address.toLowerCase()}`
      ) || '0'
    )
  } else {
    return null
  }
}
export {
  getMeetingsScheduled,
  getNotificationTime,
  getSignature,
  removeSignature,
  saveMeetingsScheduled,
  saveNotificationTime,
  saveSignature,
}
