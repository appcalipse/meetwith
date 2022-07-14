import { unsealData } from 'iron-session'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'

import { AccountSession } from '../../../types/Session'
import {
  SESSION_COOKIE_NAME,
  sessionOptions,
} from '../../../utils/auth/withSessionApiRoute'
import { apiUrl } from '../../../utils/constants'
import { checkSignature } from '../../../utils/cryptography'

const notAuthorized = new Response('Auth required', {
  status: 401,
})

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const ironSessionCookie = req.cookies[SESSION_COOKIE_NAME]

  if (!ironSessionCookie) {
    console.log('No session cookie')
    return notAuthorized
  }

  const session = (await unsealData(ironSessionCookie, sessionOptions)) as {
    account: AccountSession
  }

  console.log(session)

  if (!session?.account) return notAuthorized

  try {
    //TODO remove this shitty from edge functions so no api for nonce have to exist, cause this middleware on edge functions cannot use the database.ts
    const response = await (
      await fetch(`${apiUrl}/accounts/nonce_hidden/${session.account.address}`)
    ).json()

    const recovered = checkSignature(
      session.account.signature,
      response.nonce! as number
    )

    if (session.account.address.toLowerCase() !== recovered.toLowerCase())
      return notAuthorized

    return NextResponse.next()
  } catch (e) {
    console.error(e)
    throw e
  }
}
