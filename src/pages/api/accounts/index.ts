import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../utils/auth/withSessionApiRoute'
import { initAccountDBForWallet, initDB } from '../../../utils/database'

const createAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

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
    await req.session.save()

    res.status(200).json(account)
    return
  }

  res.status(404).send('Not found')
}

export default withSessionRoute(withSentry(createAccount))
