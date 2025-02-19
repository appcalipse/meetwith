import * as Sentry from '@sentry/node'
import { add, format } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  getAccountsWithTgConnected,
  getConferenceDataBySlotId,
  getSlotsForAccount,
} from '@/utils/database'
import { sendDm } from '@/utils/services/telegram.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const tgConnectedAccounts = await getAccountsWithTgConnected()
      const startDate = new Date()
      const endDate = add(startDate, { minutes: 45 })
      for (const account of tgConnectedAccounts) {
        const slots = await getSlotsForAccount(
          account.account_address,
          startDate,
          endDate
        )
        for (const slot of slots) {
          if (!slot.id) continue
          const meeting = await getConferenceDataBySlotId(slot.id)
          const message = `You have a meeting (${
            meeting.title || 'No Title'
          }) starting soon\n Start time: ${format(
            new Date(slot.start),
            'HH:mm'
          )}\n Meeting Link: ${meeting.meeting_url}`
          // Send telegram message
          await sendDm(account.telegram_id, message)
        }
      }
      return res.status(200).send('OK')
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Google Meet Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
