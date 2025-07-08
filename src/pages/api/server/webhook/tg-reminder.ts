import * as Sentry from '@sentry/node'
import { add, isWithinInterval } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { dateToLocalizedRange } from '@/utils/calendar_manager'
import { MeetingRepeatIntervals } from '@/utils/constants/schedule'
import {
  getAccountsWithTgConnected,
  getConferenceDataBySlotId,
  getSlotsForAccountMinimal,
} from '@/utils/database'
import { sendDm } from '@/utils/services/telegram.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const tgConnectedAccounts = await getAccountsWithTgConnected()
      const currentTime = new Date()
      const promises: Promise<void>[] = []
      for (const account of tgConnectedAccounts) {
        const promise = new Promise<void>(async (resolve, reject) => {
          const slots = await getSlotsForAccountMinimal(
            account.account_address,
            currentTime
          )
          for (const slot of slots) {
            try {
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
                const reminderTimeEnd = add(reminderTime, {
                  seconds: 60,
                })
                const startInterval: Interval = {
                  start: reminderTime,
                  end: reminderTimeEnd,
                }
                if (!isWithinInterval(currentTime, startInterval)) continue
                const message = `You have a meeting (${
                  meeting.title || 'No Title'
                }) \n Starting in ${
                  interval.label
                }. \n Meeting Time: ${dateToLocalizedRange(
                  new Date(slot.start),
                  new Date(slot.end),
                  account.timezone,
                  true
                )} \n Meeting Link: ${meeting.meeting_url}`
                // eslint-disable-next-line no-restricted-syntax
                console.info(
                  `
              Sending Tg message: ${message} to ${account.account_address}
              `
                )

                await sendDm(account.telegram_id, message)
                break
              }
            } catch (e) {
              console.error(e)
              Sentry.captureException(e)
              reject(e)
            }
            resolve()
          }
        })
        promises.push(promise)
      }
      await Promise.all(promises)
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
