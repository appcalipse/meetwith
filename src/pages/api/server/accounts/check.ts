import { NextApiRequest, NextApiResponse } from 'next'

import { notAuthorized } from '@/middleware'
import { checkSignature } from '@/utils/cryptography'
import { getAccountNonce } from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'

const checkAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { address, signature } = req.body

    try {
      const nonce = await getAccountNonce(address)
      const recovered = checkSignature(signature, nonce)

      if (address.toLowerCase() !== recovered.toLowerCase()) {
        return notAuthorized()
      }

      return res.send('Authorized')
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        return res.status(404).json({ error: 'Account not found' })
      }
      console.error('Error in checkAccount:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  return res.status(405).send('Method not allowed')
}

export default checkAccount
