import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../utils/auth/withSessionApiRoute'
import { checkSignature } from '../../../utils/cryptography'
import { getAccountFromDB } from '../../../utils/database'

const loginRoute = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { identifier, signature } = req.body
    try {
      const account = await getAccountFromDB(identifier as string)
      console.log('login')
      // match signature and identifier
      // make sure people don't screw up others by sending requests to create accounts
      const recovered = checkSignature(signature, account.nonce)

      if (identifier?.toLowerCase() !== recovered.toLowerCase()) {
        res.status(401).send('Not authorized')
        return
      }

      // set the account in the session in order to use it on other requests
      req.session.account = {
        ...account,
        signature,
      }
      await req.session.save()

      res.status(200).json(account)
    } catch (e) {
      res.status(404).send('Not found')
    }
  }
}

export default withSessionRoute(loginRoute)
