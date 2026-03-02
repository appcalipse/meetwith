import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import {
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getAccountPreferences,
  setAccountNotificationSubscriptions,
  updateTermsAccepted,
} from '@/utils/database'
import { addContactToResendNewsletter } from '@/utils/email_helper'
import { isValidEmail } from '@/utils/validations'

type Body = { accepted: boolean; email?: string }

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(404).send('Not found')
  }

  const account_address = req.session.account!.address
  const body = req.body as Body

  if (typeof body.accepted !== 'boolean') {
    return res.status(400).json({ error: 'accepted is required' })
  }

  if (body.accepted === false) {
    try {
      await updateTermsAccepted(account_address, false)
      return res.status(200).json({ ok: true })
    } catch (e) {
      Sentry.captureException(e)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  const address = account_address.toLowerCase()
  const [accountEmail, preferences] = await Promise.all([
    getAccountNotificationSubscriptionEmail(address),
    getAccountPreferences(address),
  ])

  const firstName = preferences?.name ?? undefined

  if (accountEmail) {
    try {
      await addContactToResendNewsletter(accountEmail, firstName)
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).json({
        error:
          "We couldn't add you to updates right now. Please try again in a moment.",
      })
    }
    try {
      await updateTermsAccepted(address, true)
      return res.status(200).json({ ok: true })
    } catch (e) {
      Sentry.captureException(e)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  const providedEmail = body.email?.trim()
  if (!providedEmail || !isValidEmail(providedEmail)) {
    return res.status(400).json({
      code: 'EMAIL_REQUIRED',
      message: 'Please provide your email to continue.',
    })
  }

  try {
    await addContactToResendNewsletter(providedEmail, firstName)
  } catch (e) {
    Sentry.captureException(e)
    return res.status(503).json({
      error:
        "We couldn't add you to updates right now. Please try again in a moment.",
    })
  }

  try {
    const current = await getAccountNotificationSubscriptions(address)
    const withoutEmail = current.notification_types.filter(
      t => t.channel !== NotificationChannel.EMAIL
    )
    await setAccountNotificationSubscriptions(address, {
      account_address: address,
      notification_types: [
        ...withoutEmail,
        {
          channel: NotificationChannel.EMAIL,
          destination: providedEmail,
          disabled: false,
        },
      ],
    })
    await updateTermsAccepted(address, true)
    return res.status(200).json({ ok: true })
  } catch (e) {
    Sentry.captureException(e)
    return res.status(500).json({ error: 'Failed to update preferences' })
  }
}

export default withSessionRoute(handle)
