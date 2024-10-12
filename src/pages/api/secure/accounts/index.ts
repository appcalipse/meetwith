import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MeetingProvider } from '@/types/Meeting'
import { getAccountFromDB, updateAccountPreferences } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const account_id = req.session.account!.address
    const account = await getAccountFromDB(account_id, true)
    return res.status(200).json(account)
  } else if (req.method === 'POST') {
    const account_id = req.session.account!.address
    const account = req.body

    if (account.address !== account_id) {
      return res.status(403).send("You can't edit someone else's account")
    }

    try {
      const updatedAccount = await updateAccountPreferences(account)

      req.session.account = {
        ...updatedAccount,
        signature: req.session.account!.signature,
      }

      //avoid exploding cookie size
      req.session.account.preferences = {
        timezone: '',
        availableTypes: [],
        availabilities: [],
        meetingProvider: [MeetingProvider.HUDDLE],
      }

      await req.session.save()

      return res.status(200).json(updatedAccount)
    } catch (e) {
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
