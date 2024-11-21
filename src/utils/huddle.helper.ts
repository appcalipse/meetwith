export const UTM_PARAMS =
  '&utm_source=partner&utm_medium=calendar&utm_campaign=mww'

export const HUDDLE_BASE_URL = 'https://meetwithwallet.huddle01.com/'
export const HUDDLE_API_URL = 'https://api.huddle01.com/api'

export const addUTMParams = (originalUrl: string) => {
  let startChar = ''
  if (originalUrl.indexOf('?') !== -1) {
    startChar = '&'
  } else {
    startChar = '?'
  }
  return `${originalUrl}${startChar}utm_source=partner&utm_medium=calendar&utm_campaign=mww`
}
