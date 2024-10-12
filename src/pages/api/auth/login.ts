import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'

import { checkSignature } from '../../../utils/cryptography'
import { getAccountFromDB } from '../../../utils/database'

const loginRoute = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { identifier, signature } = req.body
    try {
      const account = await getAccountFromDB(identifier as string, true)

      // match signature and identifier
      // make sure people don't screw up others by sending requests to create accounts
      const recovered = checkSignature(signature, account.nonce)

      if (identifier?.toLowerCase() !== recovered.toLowerCase()) {
        return res.status(401).send('Not authorized')
      }

      // set the account in the session in order to use it on other requests
      req.session.account = {
        ...account,
        signature,
      }

      //avoid exploding cookie size
      req.session.account.preferences = {
        timezone: '',
        availableTypes: [],
        availabilities: [],
        meetingProvider: [MeetingProvider.HUDDLE],
      }
      await req.session.save()

      return res.status(200).json(account)
    } catch (e) {
      Sentry.captureException(e)
      return res.status(404).send('Not found')
    }
  }
}

export default withSessionRoute(loginRoute)
