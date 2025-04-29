import * as Sentry from '@sentry/node'
import { add, isWithinInterval } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { dateToLocalizedRange } from '@/utils/calendar_manager'
import { MeetingRepeatIntervals } from '@/utils/constants/schedule'
import {
  getConferenceDataBySlotId,
  getDiscordAccounts,
  getSlotsForAccount,
} from '@/utils/database'
import { dmAccount } from '@/utils/services/discord.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const discordAccounts = await getDiscordAccounts()
      const currentTime = new Date()
      for (const account of discordAccounts) {
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
              Sending Discord message: ${message} to ${account.account_address}
              `
            )
            await dmAccount(
              account.account_address,
              account.discord_id,
              message
            )
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
