import { NextApiRequest, NextApiResponse } from 'next'

export default async function simpleDiscordMeet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return res.status(200).json({
      meeting_info: {
        DBSlotEnhanced: {
          iv: 'string',
          ephemPublicKey: 'string',
          ciphertext: 'string',
          mac: 'string',
        },
      },
      participants: ['string1', 'string2'],
      participants_not_available: ['string3', 'string4'],
      no_account: ['string5', 'string6'],
    })
  }
  return res.status(404).send('Not found')
}
