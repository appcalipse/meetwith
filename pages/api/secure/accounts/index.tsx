import { NextApiRequest, NextApiResponse } from 'next'
import { initDB, updateAccountPreferences } from '../../../../utils/database'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_id = req.headers.account as string
    const account = req.body

    if (account.address !== account_id) {
      res.status(403).send("You cant edit someone else's account")
    }

    try {
      const updatedAccount = await updateAccountPreferences(account)

      res.status(200).json(updatedAccount)
    } catch (e) {
      res.status(500).send(e)
    }
    return
  }

  res.status(404).send('Not found')
}
