import { NextApiRequest, NextApiResponse } from 'next'

import { getExistingAccountsFromDB } from '../../../utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { addresses, fullInformation } = req.body

    const accounts = await getExistingAccountsFromDB(
      addresses as string[],
      fullInformation
    )
    return res.status(200).json(accounts)
  }
  return res.status(404).send('Not found')
}

export default handler
