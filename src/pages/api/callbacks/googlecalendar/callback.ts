import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'

import { Account } from '../../../../types/Account'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { updateConnectedAccounts } from '../../../../utils/database'

const BASE_URL = 'http://localhost:3000'

const credentials = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query

  // Check that user is authenticated
  // const session = await getSession({ req: req });

  // if (!session?.user?.id) {
  //   res.status(401).json({ message: "You must be logged in to do this" });
  //   return;
  // }

  //console.log('query', req.headers.cookie)

  if (!req.session.account) {
    console.log('NO ACCOUNT')
    res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
    return
  }

  if (code && typeof code !== 'string') {
    res.status(400).json({ message: '`code` must be a string' })
    return
  }
  if (!credentials) {
    res
      .status(400)
      .json({ message: 'There are no Google Credentials installed.' })
    return
  }

  const { client_secret, client_id } = credentials
  const redirect_uri = BASE_URL + '/api/callbacks/googlecalendar/callback'

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  )

  let key: {
    access_token: string
    refresh_token: string
    scope: string
    token_type: string
    expiry_date: number
  } | null = null

  if (code) {
    const token = await oAuth2Client.getToken(code)
    key = token.res?.data
  }

  // await prisma.credential.create({
  //   data: {
  //     type: "google_calendar",
  //     key,
  //     userId: session.user.id,
  //   },
  // });
  // const state = decodeOAuthState(req);
  //console.log(key, typeof key);
  const payload: Account = {
    ...req.session.account,
    connected_accounts: {
      ...req.session.account.connected_accounts,
      google: {
        token: key!.access_token,
        refresh_token: key!.refresh_token,
      },
    },
  }
  await updateConnectedAccounts(payload)
  res.redirect(`/dashboard`)
}

export default withSessionRoute(handler)
