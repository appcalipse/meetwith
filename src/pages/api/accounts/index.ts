import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { checkSignature } from '../../../utils/cryptography'
import {
  initAccountDBForWallet,
  initDB,
  updateAccountFromInvite,
} from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    initDB()
    let account

    // make sure people don't screw up others by sending requests to create accounts
    const recovered = checkSignature(
      req.body.signature,
      req.body.nonce! as number
    )
    if (req.body.address.toLowerCase() !== recovered.toLowerCase())
      res.status(401).send('Not authorized')

    if (req.method === 'POST') {
      account = await initAccountDBForWallet(
        req.body.address,
        req.body.signature,
        req.body.timezone,
        req.body.nonce
      )
    } else {
      account = await updateAccountFromInvite(
        req.body.address,
        req.body.signature,
        req.body.timezone,
        req.body.nonce
      )
    }

    res.status(200).json(account)
    return
  }

  res.status(404).send('Not found')
})
