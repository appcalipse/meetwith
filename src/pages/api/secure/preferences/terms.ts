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
import { addContactToResendSegments } from '@/utils/email_helper'
import { isValidEmail } from '@/utils/validations'

const RESEND_SEGMENT_PRODUCT_UPDATES =
  process.env.RESEND_SEGMENT_PRODUCT_UPDATES ?? ''
const RESEND_SEGMENT_TIPS_AND_EDUCATION =
  process.env.RESEND_SEGMENT_TIPS_AND_EDUCATION ?? ''
const RESEND_SEGMENT_RESEARCH_AND_FEEDBACK =
  process.env.RESEND_SEGMENT_RESEARCH_AND_FEEDBACK ?? ''

type Body = {
  accepted: boolean
  email?: string
  productUpdates?: boolean
  tipsAndEducation?: boolean
  researchAndFeedbackRequests?: boolean
}

function getSegmentIds(body: Body): string[] {
  const ids: string[] = []
  if (body.productUpdates && RESEND_SEGMENT_PRODUCT_UPDATES) {
    ids.push(RESEND_SEGMENT_PRODUCT_UPDATES)
  }
  if (body.tipsAndEducation && RESEND_SEGMENT_TIPS_AND_EDUCATION) {
    ids.push(RESEND_SEGMENT_TIPS_AND_EDUCATION)
  }
  if (
    body.researchAndFeedbackRequests &&
    RESEND_SEGMENT_RESEARCH_AND_FEEDBACK
  ) {
    ids.push(RESEND_SEGMENT_RESEARCH_AND_FEEDBACK)
  }
  return ids
}

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
      console.error('Failed to update terms_accepted to false', e)
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
  const segmentIds = getSegmentIds(body)

  if (accountEmail) {
    if (segmentIds.length > 0) {
      try {
        await addContactToResendSegments(accountEmail, firstName, segmentIds)
      } catch (e) {
        console.error('Failed to add existing email to Resend segments', e)
        Sentry.captureException(e)
        return res.status(503).json({
          error:
            "We couldn't add you to updates right now. Please try again in a moment.",
        })
      }
    }
    try {
      await updateTermsAccepted(address, true)
      return res.status(200).json({ ok: true })
    } catch (e) {
      console.error(
        'Failed to update terms_accepted to true (existing email path)',
        e
      )
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

  if (segmentIds.length > 0) {
    try {
      await addContactToResendSegments(providedEmail, firstName, segmentIds)
    } catch (e) {
      console.error('Failed to add provided email to Resend segments', e)
      Sentry.captureException(e)
      return res.status(503).json({
        error:
          "We couldn't add you to updates right now. Please try again in a moment.",
      })
    }
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
    console.error('Failed to persist notification email or terms_accepted', e)
    Sentry.captureException(e)
    return res.status(500).json({ error: 'Failed to update preferences' })
  }
}

export default withSessionRoute(handle)
