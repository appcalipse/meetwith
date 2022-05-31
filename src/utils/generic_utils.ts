import { useEffect, useState } from 'react'
import slugify from 'slugify'

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
