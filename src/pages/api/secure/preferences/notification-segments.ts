import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { RESEND_RATE_LIMIT_DELAY_MS } from '@/utils/constants'
import { getAccountNotificationSubscriptionEmail } from '@/utils/database'
import {
  addContactToResendSegments,
  getNotificationSegmentMembership,
  removeContactFromResendSegment,
} from '@/utils/email_helper'

const RESEND_SEGMENT_PRODUCT_UPDATES =
  process.env.RESEND_SEGMENT_PRODUCT_UPDATES ?? ''
const RESEND_SEGMENT_TIPS_AND_EDUCATION =
  process.env.RESEND_SEGMENT_TIPS_AND_EDUCATION ?? ''
const RESEND_SEGMENT_RESEARCH_AND_FEEDBACK =
  process.env.RESEND_SEGMENT_RESEARCH_AND_FEEDBACK ?? ''

type SegmentsBody = {
  productUpdates?: boolean
  tipsAndEducation?: boolean
  researchAndFeedbackRequests?: boolean
}

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address
  const address = account_address.toLowerCase()

  if (req.method === 'GET') {
    const email = await getAccountNotificationSubscriptionEmail(address)
    if (!email) {
      return res.status(200).json({
        productUpdates: false,
        tipsAndEducation: false,
        researchAndFeedbackRequests: false,
      })
    }
    try {
      const membership = await getNotificationSegmentMembership(email)
      return res.status(200).json(membership)
    } catch (e) {
      console.error('Failed to fetch segment membership', e)
      Sentry.captureException(e)
      return res.status(500).json({
        error: 'Failed to load notification preferences',
      })
    }
  }

  if (req.method === 'POST') {
    const body = req.body as SegmentsBody
    const email = await getAccountNotificationSubscriptionEmail(address)
    if (!email) {
      return res.status(400).json({
        error: 'Add an email address in Email notifications first.',
      })
    }

    const next = {
      productUpdates: !!body.productUpdates,
      tipsAndEducation: !!body.tipsAndEducation,
      researchAndFeedbackRequests: !!body.researchAndFeedbackRequests,
    }

    const sleep = (ms: number) =>
      new Promise<void>(resolve => setTimeout(resolve, ms))

    try {
      const current = await getNotificationSegmentMembership(email)

      const firstName = undefined

      if (
        next.productUpdates &&
        !current.productUpdates &&
        RESEND_SEGMENT_PRODUCT_UPDATES
      ) {
        await addContactToResendSegments(email, firstName, [
          RESEND_SEGMENT_PRODUCT_UPDATES,
        ])
      }
      if (
        !next.productUpdates &&
        current.productUpdates &&
        RESEND_SEGMENT_PRODUCT_UPDATES
      ) {
        await removeContactFromResendSegment(
          email,
          RESEND_SEGMENT_PRODUCT_UPDATES
        )
      }

      await sleep(RESEND_RATE_LIMIT_DELAY_MS)

      if (
        next.tipsAndEducation &&
        !current.tipsAndEducation &&
        RESEND_SEGMENT_TIPS_AND_EDUCATION
      ) {
        await addContactToResendSegments(email, firstName, [
          RESEND_SEGMENT_TIPS_AND_EDUCATION,
        ])
      }
      if (
        !next.tipsAndEducation &&
        current.tipsAndEducation &&
        RESEND_SEGMENT_TIPS_AND_EDUCATION
      ) {
        await removeContactFromResendSegment(
          email,
          RESEND_SEGMENT_TIPS_AND_EDUCATION
        )
      }

      await sleep(RESEND_RATE_LIMIT_DELAY_MS)

      if (
        next.researchAndFeedbackRequests &&
        !current.researchAndFeedbackRequests &&
        RESEND_SEGMENT_RESEARCH_AND_FEEDBACK
      ) {
        await addContactToResendSegments(email, firstName, [
          RESEND_SEGMENT_RESEARCH_AND_FEEDBACK,
        ])
      }
      if (
        !next.researchAndFeedbackRequests &&
        current.researchAndFeedbackRequests &&
        RESEND_SEGMENT_RESEARCH_AND_FEEDBACK
      ) {
        await removeContactFromResendSegment(
          email,
          RESEND_SEGMENT_RESEARCH_AND_FEEDBACK
        )
      }

      return res.status(200).json(next)
    } catch (e) {
      console.error('Failed to save segment membership', e)
      Sentry.captureException(e)
      return res.status(503).json({
        error:
          "We couldn't update your notification preferences right now. Please try again in a moment.",
      })
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
