import { GuestPollDetails } from '@/types/QuickPoll'

const SIGNATURE_KEY = 'current_user_sig'
const SCHEDULES = 'meetings_scheduled'
const NOTIFICATION = 'group_notifications'
const GUEST_POLL_DETAILS = 'quickpoll_guest_details'
const HIDE_GROUP_AVAILABILITY_LABELS = 'hide_group_availability_labels'
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
    JSON.stringify({ date: Date.now() + ONE_DAY_IN_MILLISECONDS, lookups: 0 })
  )
}
const incrementNotificationLookup = (account_address?: string) => {
  if (!account_address) return
  const notificationData = getNotificationTime(account_address)
  if (notificationData) {
    window.localStorage.setItem(
      `${NOTIFICATION}:${account_address.toLowerCase()}`,
      JSON.stringify({
        date: notificationData.date,
        lookups: notificationData.lookups + 1,
      })
    )
  }
}
const getNotificationTime = (account_address?: string) => {
  if (account_address) {
    return JSON.parse(
      window.localStorage.getItem(
        `${NOTIFICATION}:${account_address.toLowerCase()}`
      ) || '{ "date": 0, "lookups": 0 }'
    ) as {
      date: number
      lookups: number
    }
  } else {
    return null
  }
}
const saveGuestPollDetails = (
  pollId: string,
  guestDetails: GuestPollDetails
) => {
  window.localStorage.setItem(
    `${GUEST_POLL_DETAILS}:${pollId}`,
    JSON.stringify(guestDetails)
  )
}

const getGuestPollDetails = (pollId: string): GuestPollDetails | null => {
  const stored = window.localStorage.getItem(`${GUEST_POLL_DETAILS}:${pollId}`)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

const removeGuestPollDetails = (pollId: string) => {
  window.localStorage.removeItem(`${GUEST_POLL_DETAILS}:${pollId}`)
}

const getHideGroupAvailabilityLabels = (account_address: string): boolean => {
  if (typeof window === 'undefined' || !account_address) return false
  const stored = window.localStorage.getItem(
    `${HIDE_GROUP_AVAILABILITY_LABELS}:${account_address.toLowerCase()}`
  )
  return stored === 'true'
}

const setHideGroupAvailabilityLabels = (
  account_address: string,
  value: boolean
): void => {
  if (typeof window === 'undefined' || !account_address) return
  window.localStorage.setItem(
    `${HIDE_GROUP_AVAILABILITY_LABELS}:${account_address.toLowerCase()}`,
    String(value)
  )
}

export {
  getGuestPollDetails,
  getHideGroupAvailabilityLabels,
  getMeetingsScheduled,
  getNotificationTime,
  getSignature,
  incrementNotificationLookup,
  removeGuestPollDetails,
  removeSignature,
  saveGuestPollDetails,
  saveMeetingsScheduled,
  saveNotificationTime,
  saveSignature,
  setHideGroupAvailabilityLabels,
}
