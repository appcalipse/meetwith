import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(req.query)
  console.log(req.body)
  console.log(req.headers)
  return res.status(200).send('OK')
}

export default handler
