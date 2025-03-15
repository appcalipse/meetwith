import * as Sentry from '@sentry/node'
import { add, format, isWithinInterval } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingRepeatIntervals } from '@/utils/constants/schedule'
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
      const currentTime = new Date()
      for (const account of tgConnectedAccounts) {
        const slots = await getSlotsForAccount(
          account.account_address,
          currentTime
        )
        for (const slot of slots) {
          if (!slot.id) continue
          const meeting = await getConferenceDataBySlotId(slot.id)
          const reminders = (meeting?.reminders || []).sort((a, b) => b - a)
          for (const reminder of reminders) {
            const interval = MeetingRepeatIntervals.find(
              i => i.value === reminder
            )
            const intervalInMinutes = interval?.interval
            if (!intervalInMinutes) continue
            const reminderTime = add(new Date(slot.start), {
              minutes: -intervalInMinutes,
            })
            const reminderTimeInterval = add(reminderTime, {
              minutes: -9,
            })
            const startInterval: Interval = {
              start: reminderTimeInterval,
              end: reminderTime,
            }
            if (!isWithinInterval(currentTime, startInterval)) continue
            const message = `You have a meeting (${
              meeting.title || 'No Title'
            }) starting in ${interval.label} \n Start time: ${format(
              new Date(slot.start),
              'HH:mm a'
            )}\n Meeting Link: ${meeting.meeting_url}`
            await sendDm(account.telegram_id, message)
            break
          }
        }
      }
      return res.status(200).send('OK')
    } catch (e) {
      Sentry.captureException(e)
      console.error(e)
      return res.status(503).send('Resource Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
