import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { initDB, updateAccountPreferences } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_id = req.session.account!.address
    const account = req.body

    if (account.address !== account_id) {
      return res.status(403).send("You can't edit someone else's account")
    }

    try {
      const updatedAccount = await updateAccountPreferences(account)
      if (!updatedAccount) {
        throw new Error('Invalid account data')
      }
      req.session.account = {
        ...updatedAccount,
        signature: req.session.account!.signature,
      }
      delete req.session.account.preferences

      await req.session.save()

      return res.status(200).json(updatedAccount)
    } catch (e) {
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
