import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getTeam, initDB } from '@/utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    try {
      const { teamId } = req.query

      const team = await getTeam(teamId as string)

      if (!team) {
        res.status(404).send('Team not found')
        return
      }

      res.status(200).json(team)
      return
    } catch (error) {
      console.error(error)
      return
    }
  }
  res.status(404).send('Not found')
})
