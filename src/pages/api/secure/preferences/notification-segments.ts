import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getAccountNotificationSubscriptionEmail } from '@/utils/database'
import {
  getNotificationSegmentMembership,
  syncResendSegmentsForEmail,
} from '@/utils/email_helper'
import { resendQueue } from '@/utils/workers/resend.queue'

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

    resendQueue.add(() => syncResendSegmentsForEmail(email, next))
    return res.status(200).json(next)
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
