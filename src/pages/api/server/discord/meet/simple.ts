import { NextApiRequest, NextApiResponse } from 'next'

export default async function simpleDiscordMeet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return res.status(200).json({
      meeting_info: {
        meeting_info_encrypted: {
          iv: 'string',
          ephemPublicKey: 'string',
          ciphertext: 'string',
          mac: 'string',
        },
        id: 'some_uuid',
        created_at: new Date(),
        meeting_info_file_path: 'string',
        version: 1,
        source: 'mww',
        account_address: 'the scheduler 0xAddress',
      },
      participants: ['string1', 'string2'],
      participants_not_available: ['string3', 'string4'],
      no_account: ['string5', 'string6'],
    })
  }
  return res.status(404).send('Not found')
}
