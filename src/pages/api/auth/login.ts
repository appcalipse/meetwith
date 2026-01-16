import * as Sentry from '@sentry/nextjs'
import EthCrypto from 'eth-crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { Account } from '@/types/Account'
import { MeetingProvider } from '@/types/Meeting'

import { checkSignature, encryptContent } from '../../../utils/cryptography'
import { getAccountFromDB, initDB } from '../../../utils/database'

const loginRoute = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { identifier, signature } = req.body
    try {
      const account = await getAccountFromDB(identifier as string, true)

      // match signature and identifier
      // make sure people don't screw up others by sending requests to create accounts
      const recovered = checkSignature(signature, account.nonce)

      if (identifier?.toLowerCase() !== recovered.toLowerCase()) {
        return res.status(401).send('Not authorized')
      }
      if (account && !account.internal_pub_key) {
        // The account is a migrated one and does not have an internal pub key yet
        const db = initDB()
        const newIdentity = EthCrypto.createIdentity()

        const encryptedPvtKey = encryptContent(
          signature,
          newIdentity.privateKey
        )
        await db.supabase.from<Account>('accounts').upsert(
          [
            {
              address: account.address.toLowerCase(),
              encoded_signature: encryptedPvtKey,
              internal_pub_key: newIdentity.publicKey,
              is_invited: false,
              nonce: account.nonce,
            },
          ],
          { onConflict: 'address' }
        )
      }
      // set the account in the session in order to use it on other requests
      req.session.account = {
        ...account,
        signature,
      }

      //avoid exploding cookie size
      req.session.account.preferences = {
        availabilities: [],
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        // add users name to preferences
        name: account.preferences?.name,
        timezone: '',
      }
      await req.session.save()

      return res.status(200).json(account)
    } catch (e) {
      Sentry.captureException(e)
      return res.status(404).send('Not found')
    }
  }
}

export default withSessionRoute(loginRoute)
