export const isValidEmail = (email?: string): boolean => {
  if (!email) return false
  const reg =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return reg.test(email.toLowerCase())
}

export const isValidEVMAddress = (address: string): boolean => {
  const reg = /^0x[a-fA-F0-9]{40}$/i
  return reg.test(address)
}

export const isValidUrl = (url: string): boolean => {
  const reg = /^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
  return reg.test(url)
}

export const isValidSlug = (slug: string): boolean => {
  const reg = /^([A-Za-z0-9\-\_]+)$/
  return reg.test(slug)
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
