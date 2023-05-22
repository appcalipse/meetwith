import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { address } = req.query

    try {
      const response = await fetch(
        `https://unstoppabledomains.g.alchemy.com/domains?owners=${address}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            Authorization: `Bearer ${process.env.ALCHEMY_API_KEY!}`,
          },
        }
      )
      if (response.status === 200) {
        const domains = await response.json()

        return res.status(200).json(
          domains.data.map((domain: any) => {
            return { name: domain.id }
          })
        )
      }
    } catch (e) {
      Sentry.captureException(e)
    }

    return res.status(200).json([])
  }

  return res.status(404).send('Not found')
})
