export const isValidEmail = (email?: string): boolean => {
  if (!email) return false
  const match = email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
  return !!match
}

export const isValidEVMAddress = (address: string): boolean => {
  const match = address.match(/^0x[a-fA-F0-9]{40}$/i)
  return !!match
}

export const isValidUrl = (url: string): boolean => {
  const match = url.match(
    /^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
  )
  return !!match
}

export const isEmptyString = (value: string): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true
  }
  return false
}
