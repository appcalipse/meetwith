import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'
import { checkSignature } from '@/utils/cryptography'
import { initAccountDBForWallet } from '@/utils/database'

const signupRoute = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
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
      timezone: '',
      availableTypes: [],
      availabilities: [],
      meetingProviders: [MeetingProvider.HUDDLE],
    }

    await req.session.save()

    return res.status(200).json(account)
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(signupRoute)
