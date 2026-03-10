import { SpacesServiceClient } from '@google-apps/meet'
import * as Sentry from '@sentry/node'
import { OAuth2Client } from 'google-auth-library'
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
import { Auth, google } from 'googleapis'
import { NextApiRequest, NextApiResponse } from 'next'
import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'
import { getConnectedMeetingProviders } from '@/utils/database'
import { createSpace } from '@/utils/services/master.google.service'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      let link: string | undefined

      if (req.session?.account?.address) {
        const providers = await getConnectedMeetingProviders(
          req.session.account.address
        )
        const googleMeetProvider = providers?.find(
          p => p.provider === MeetingProvider.GOOGLE_MEET
        )

        if (googleMeetProvider?.payload) {
          const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          )
          oAuth2Client.setCredentials(
            googleMeetProvider.payload as Auth.Credentials
          )

          const meetClient = new SpacesServiceClient({
            authClient: oAuth2Client as unknown as JSONClient,
          })
          const request = {}
          const response = await meetClient.createSpace(request)
          link = response[0].meetingUri || undefined
        }
      }

      if (!link) {
        link = (await createSpace()) || undefined
      }

      if (!link) {
        return res.status(503).send('Google Meet Unavailable')
      }
      return res.json({ url: link })
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Google Meet Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handler)
