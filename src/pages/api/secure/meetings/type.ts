import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import { v4 } from 'uuid'

import { isProAccount } from '@/utils/subscription_manager'

import { MeetingType } from '../../../../types/Account'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import {
  getAccountFromDB,
  initDB,
  updateAccountPreferences,
  workMeetingTypeGates,
} from '../../../../utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_id = req.session.account!.address

    const account = await getAccountFromDB(account_id)

    const isPro = isProAccount(account)

    const meetingType = req.body as MeetingType
    meetingType.description = meetingType.description?.trim() || ''

    let updatedInfo

    if (!isPro) {
      delete meetingType.scheduleGate
    }

    if (meetingType?.id) {
      // editing and not adding
      const type = account.preferences!.availableTypes.find(
        t => t.id === meetingType.id
      )

      if (!type) {
        res.status(403).send("You can't edit this meeting type")
        return
      }
      updatedInfo = {
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
    } else {
      updatedInfo = {
        ...account,
        preferences: {
          ...account.preferences!,
          availableTypes: [
            ...account.preferences!.availableTypes,
            { ...meetingType, id: v4() },
          ],
        },
      }
    }

    const updatedAccount = await updateAccountPreferences(updatedInfo)

    await workMeetingTypeGates(updatedAccount.preferences?.availableTypes || [])

    res.status(200).json(updatedAccount)
    return
  } else if (req.method === 'DELETE') {
    initDB()

    const account_id = req.session.account!.address

    const account = await getAccountFromDB(account_id)

    const { typeId } = req.body

    const type = account.preferences!.availableTypes.find(t => t.id === typeId)

    if (!type) {
      res.status(403).send("You can't remove this meeting type")
      return
    }

    if (account.preferences!.availableTypes.length == 1) {
      res.status(403).send('You should keep at least one meeting type')
      return
    }

    type.deleted = true

    const updatedInfo = {
      ...account,
      preferences: {
        ...account.preferences!,
        availableTypes: account.preferences!.availableTypes.map(t => {
          if (t.id === typeId) {
            return type
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
}

export default withSentry(withSessionRoute(handle))
