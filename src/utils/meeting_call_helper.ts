import * as Sentry from '@sentry/browser'
import { v4 as uuidv4 } from 'uuid'

export const UTM_PARAMS =
  '&utm_source=partner&utm_medium=calendar&utm_campaign=mww'

const generateMeetingUrl = async (): Promise<string> => {
  try {
    const meeting = await (
      await fetch(
        'https://wpss2zlpb9.execute-api.us-east-1.amazonaws.com/new-meeting'
      )
    ).json()

    return meeting.url
  } catch (e) {
    Sentry.captureException(e)
    return `https://app.huddle01.com/room?roomId=${uuidv4()}`
  }
}

export { generateMeetingUrl }
