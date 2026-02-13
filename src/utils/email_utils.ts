// Email utility functions

// Format date for email display
export const formatDateForEmail = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Check if displayName is an ellipsized address (format: 0x123...abcde)
// If so, return "there" for a better email greeting
export const getDisplayNameForEmail = (displayName: string): string => {
  const ellipsizedAddressPattern = /^0x[a-fA-F0-9]{3}\.\.\.[a-fA-F0-9]{5}$/
  if (ellipsizedAddressPattern.test(displayName)) {
    return 'there'
  }
  return displayName
}

// Format days remaining for email display
export const formatDaysRemainingForEmail = (daysRemaining: number): string => {
  if (daysRemaining === 0) {
    return 'today'
  }
  if (daysRemaining === 1) {
    return '1 day'
  }
  return `${daysRemaining} days`
}
