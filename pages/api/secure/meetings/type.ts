import { NextApiRequest, NextApiResponse } from 'next'
import { MeetingType } from '../../../../types/Account'
import {
  getAccountFromDB,
  initDB,
  updateAccountPreferences,
} from '../../../../utils/database'
import { withSentry } from '@sentry/nextjs';

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_id = req.headers.account as string

    const account = await getAccountFromDB(account_id)

    const meetingType = req.body as MeetingType

    const type = account.preferences!.availableTypes.find(
      t => t.id === meetingType.id
    )

    if (!type) {
      res.status(403).send("You can't edit this meeting type")
      return
    }

    const updatedInfo = {
      ...account,
      preferences: {
        ...account.preferences!,
        availableTypes: account.preferences!.availableTypes.map(t => {
          if (t.id === meetingType.id) {
            return meetingType
          }
          return t
        }),
      },
    }

    const updatedAccount = await updateAccountPreferences(updatedInfo)

    res.status(200).json(updatedAccount)
    return
  }

  res.status(404).send('Not found')
})
