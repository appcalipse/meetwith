import * as Sentry from '@sentry/browser'
import { v4 as uuidv4 } from 'uuid'

export const UTM_PARAMS =
  '&utm_source=partner&utm_medium=calendar&utm_campaign=mww'

const HUDDLE_API_URL = 'https://us-central1-nfts-apis.cloudfunctions.net'

const HUDDLE_BASE_URL = 'https://meetwithwallet.huddle01.com/'

const API_KEY = process.env.HUDDLE_API_KEY

const generateMeetingUrl = async (title?: string): Promise<string> => {
  try {
    const meeting = await (
      await fetch(`${HUDDLE_API_URL}/createroom`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'x-api-key': API_KEY!,
        },
        body: JSON.stringify({
          title: title || 'Meet with Wallet Meeting',
          roomLock: false,
        }),
      })
    ).json()

    return `${HUDDLE_BASE_URL}/${meeting.roomId}`
  } catch (e) {
    Sentry.captureException(e)
    return `https://app.huddle01.com/room?roomId=${uuidv4()}`
  }
}

const joinMeeting = async (title?: string): Promise<string> => {
  try {
    const meeting = await (
      await fetch(`${HUDDLE_API_URL}/createroom`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'x-api-key': API_KEY!,
        },
        body: JSON.stringify({
          title: title || 'Meet with Wallet Meeting',
          roomLock: false,
        }),
      })
    ).json()

    return `${HUDDLE_BASE_URL}/${meeting.roomId}`
  } catch (e) {
    Sentry.captureException(e)
    return `https://app.huddle01.com/room?roomId=${uuidv4()}`
  }
}

export { generateMeetingUrl }
