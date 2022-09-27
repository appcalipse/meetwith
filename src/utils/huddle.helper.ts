import * as Sentry from '@sentry/nextjs'
import { v4 as uuidv4 } from 'uuid'

export const UTM_PARAMS =
  '&utm_source=partner&utm_medium=calendar&utm_campaign=mww'

export const HUDDLE_BASE_URL = 'https://meetwithwallet.huddle01.com/'

export const HUDDLE_API_URL = 'https://us-central1-nfts-apis.cloudfunctions.net'

export const addUTMParams = (originalUrl: string) => {
  let startChar = ''
  if (originalUrl.indexOf('?') !== -1) {
    startChar = '&'
  } else {
    startChar = '?'
  }
  return `${originalUrl}${startChar}utm_source=partner&utm_medium=calendar&utm_campaign=mww`
}

const generateMeetingUrl = async (): Promise<string> => {
  try {
    const meetingResponse = await fetch(
      'https://wpss2zlpb9.execute-api.us-east-1.amazonaws.com/new-meeting'
    )

    if (meetingResponse.status === 200) {
      const meeting = await meetingResponse.json()
      return meeting.url
    } else {
      return `https://app.huddle01.com/room?roomId=${uuidv4()}`
    }
  } catch (e) {
    Sentry.captureException(e)
    return `https://app.huddle01.com/room?roomId=${uuidv4()}`
  }
}

export { generateMeetingUrl }
