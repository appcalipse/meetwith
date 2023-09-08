import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { notAuthorized } from '@/middleware'
import { checkSignature } from '@/utils/cryptography'
import { getAccountNonce } from '@/utils/database'

const checkAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { address, signature } = req.body

    const nonce = await getAccountNonce(address)

    const recovered = checkSignature(signature, nonce)

    if (address.toLowerCase() !== recovered.toLowerCase()) return notAuthorized

    return res.send('Authorized')
  }
  return res.status(404).send('Not found')
}

export default withSentry(checkAccount)
