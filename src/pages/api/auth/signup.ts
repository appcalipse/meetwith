import * as Sentry from '@sentry/nextjs'
import { DateTime } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { VerificationChannel } from '@/types/AccountNotifications'
import { MeetingProvider } from '@/types/Meeting'
import { checkSignature } from '@/utils/cryptography'
import { createVerification, initAccountDBForWallet } from '@/utils/database'

const signupRoute = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // make sure people don't screw up others by sending requests to create accounts
      const recovered = checkSignature(
        req.body.signature,
        req.body.nonce! as number
      )
      if (req.body.address.toLowerCase() !== recovered.toLowerCase()) {
        return res.status(401).send('Not authorized')
      }

      const account = await initAccountDBForWallet(
        req.body.address,
        req.body.signature,
        req.body.timezone,
        req.body.nonce
      )

      // set the account in the session in order to use it on other requests
      req.session.account = {
        ...account,
        signature: req.body.signature,
      }

      //avoid exploding cookie size
      req.session.account.preferences = {
        availabilities: [],
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        timezone: '',
      }

      await req.session.save()
      const expiresAt = DateTime.now()
        .plus({
          day: 1,
        })
        .toJSDate()
      const jti = `${account.address}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`

      await createVerification(
        account.address,
        jti,
        VerificationChannel.RESET_EMAIL,
        expiresAt
      )
      return res.status(200).json({ ...account, jti })
    } catch (e: unknown) {
      Sentry.captureException(e)
      console.error(e)
      return res.status(500).send('Internal server error')
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(signupRoute)
