import { PaidMeetingTypes } from '@meta/Account'
import { captureException } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getPaidSessionsByMeetingType } from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      const account_address = req.session.account!.address
      if (!account_address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const owner_account_address = extractQuery(req.query, 'account_address')
      if (!owner_account_address) {
        return res.status(400).json({ error: 'Account address is required' })
      }
      const meetingSessions = await getPaidSessionsByMeetingType(
        account_address,
        owner_account_address
      )
      const data = meetingSessions.reduce<PaidMeetingTypes[]>(
        (acc, session, _a, allsessions) => {
          const sessionExist = acc.find(s => s.id === session.id)
          if (sessionExist) {
            return acc.map((s, i) => {
              if (s.id === session.id) {
                return {
                  ...s,
                  session_total: s.session_total + session.session_total,
                  session_used: s.session_used + session.session_used,
                }
              }
              return s
            })
          } else {
            acc.push(session)
          }
          return acc
        },
        []
      )

      return res.status(200).json(data)
    }
  } catch (e) {
    if (e instanceof Error) {
      captureException(e)
      return res.status(500).json('An unexpected error occurred')
    }
  }
}

export default withSessionRoute(handle)
