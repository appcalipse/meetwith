import { useEffect, useState } from 'react'
import slugify from 'slugify'

import { MeetingProvider } from '@/types/Meeting'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'

import { MeetingPermissions } from './constants/schedule'

export const zeroAddress = '0x0000000000000000000000000000000000000000' as const

export function parseUnits(value: `${number}`, decimals: number) {
  let [integer, fraction = '0'] = value.split('.')

  const negative = integer.startsWith('-')
  if (negative) integer = integer.slice(1)

  // trim leading zeros.
  fraction = fraction.replace(/(0+)$/, '')

  // round off if the fraction is larger than the number of decimals.
  if (decimals === 0) {
    integer = `${Math.round(Number(`${integer}.${fraction}`))}`
    fraction = ''
  } else if (fraction.length > decimals) {
    const [left, unit, right] = [
      fraction.slice(0, decimals - 1),
      fraction.slice(decimals - 1, decimals),
      fraction.slice(decimals),
    ]

    const rounded = Math.round(Number(`${unit}.${right}`))
    if (rounded > 9)
      fraction = `${BigInt(left) + BigInt(1)}0`.padStart(left.length + 1, '0')
    else fraction = `${left}${rounded}`

    if (fraction.length > decimals) {
      fraction = fraction.slice(1)
      integer = `${BigInt(integer) + 1n}`
    }

    fraction = fraction.slice(0, decimals)
  } else {
    fraction = fraction.padEnd(decimals, '0')
  }

  return BigInt(`${negative ? '-' : ''}${integer}${fraction}`)
}
export const isAccountSchedulerOrOwner = (
  participants?: ParticipantInfo[],
  address?: string,
  participantsType = [ParticipantType.Scheduler, ParticipantType.Owner]
) =>
  participantsType.includes(
    participants?.find(p => p.account_address === address)?.type ||
      ParticipantType?.Invitee
  )

export const canAccountAccessPermission = (
  permissions?: MeetingPermissions[],
  participants?: ParticipantInfo[],
  address?: string,
  permission = MeetingPermissions.SEE_GUEST_LIST
) =>
  permissions === undefined ||
  !!permissions?.includes(permission) ||
  isAccountSchedulerOrOwner(participants, address)

export function formatUnits(value: bigint, decimals: number) {
  let display = value.toString()

  const negative = display.startsWith('-')
  if (negative) display = display.slice(1)

  display = display.padStart(decimals, '0')

  const integer = display.slice(0, display.length - decimals)
  let fraction = display.slice(display.length - decimals)
  fraction = fraction.replace(/(0+)$/, '')
  return `${negative ? '-' : ''}${integer || '0'}${
    fraction ? `.${fraction}` : ''
  }`
}

export const generateTwitterUrl = (url: string) => {
  if (url.startsWith('@')) {
    return `https://twitter.com/${url.replace('@', '')}`
  } else if (url.startsWith('http')) {
    return url
  } else if (url.startsWith('twitter.com')) {
    ;`https://${url}`
  } else {
    return `https://twitter.com/${url}`
  }
}

export const generateTelegramUrl = (url: string) => {
  if (url.startsWith('@')) {
    return `https://t.me/${url.replace('@', '')}`
  } else if (url.startsWith('http')) {
    return url
  } else if (url.startsWith('t.me')) {
    ;`https://${url}`
  } else {
    return `https://t.me/${url}`
  }
}

export const getSlugFromText = (text: string) =>
  slugify(text, {
    lower: true,
    strict: true,
  })

export const useDebounce = (value: any, delay: number) => {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler)
      }
    },
    [value, delay] // Only re-call effect if value or delay changes
  )
  return debouncedValue
}

export const shouldEnforceColorOnPath = (pathname: string): boolean => {
  return pathname === '/' || pathname.indexOf('/features/') !== -1
}
export const isJson = (str: string) => {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

export const renderProviderName = (provider: MeetingProvider) => {
  switch (provider) {
    case MeetingProvider.GOOGLE_MEET:
      return 'Google Meet'
    case MeetingProvider.ZOOM:
      return 'Zoom'
    case MeetingProvider.HUDDLE:
      return 'Huddle01'
    case MeetingProvider.JITSI_MEET:
      return 'Jitsi Meet'
    default:
      return 'Custom'
  }
}

export const convertMinutes = (minutes: number) => {
  if (minutes < 60) {
    return { amount: minutes, type: 'minutes', isEmpty: false }
  } else if (minutes < 60 * 24) {
    return { amount: Math.floor(minutes / 60), type: 'hours', isEmpty: false }
  } else {
    return {
      amount: Math.floor(minutes / (60 * 24)),
      type: 'days',
      isEmpty: false,
    }
  }
}

export const extractQuery = <T extends string = string>(
  query: Partial<{
    [key: string]: string | string[]
  }>,
  key: string,
  validValues?: T[]
): T | undefined => {
  const value = query[key]
  let result: string | undefined

  if (Array.isArray(value)) {
    result = value[0] || undefined
  } else if (typeof value === 'string') {
    result = value
  }

  if (!result || result === 'undefined') return undefined

  // If valid values provided, check against them
  if (validValues && !validValues.includes(result as T)) {
    return undefined
  }

  return result as T
}
export const formatCurrency = (
  amount: number,
  currency = 'USD',
  minimumFractionDigits = 0
) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
  }).format(amount)
}

export const deduplicateArray = <T = string>(arr: T[]): T[] => {
  return Array.from(new Set(arr)).filter(
    (item): item is T => item !== null && item !== undefined
  )
}

export const formatCountdown = (seconds: number): string => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}
