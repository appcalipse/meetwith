import { unsealData } from 'iron-session'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'

import { AccountSession } from '../../../types/Session'
import {
  SESSION_COOKIE_NAME,
  sessionOptions,
} from '../../../utils/auth/withSessionApiRoute'
import { checkSignature } from '../../../utils/cryptography'
import { getAccountNonce } from '../../../utils/database'

const notAuthorized = new Response('Auth required', {
  status: 401,
})

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const ironSessionCookie = req.cookies[SESSION_COOKIE_NAME]

  if (!ironSessionCookie) {
    return notAuthorized
  }

  const session = (await unsealData(ironSessionCookie, sessionOptions)) as {
    account: AccountSession
  }

  if (!session?.account) return notAuthorized

  try {
    const nonce = await getAccountNonce(session.account.address)

    const recovered = checkSignature(session.account.signature, nonce)

    if (session.account.address.toLowerCase() !== recovered.toLowerCase())
      return notAuthorized

    return NextResponse.next()
  } catch (e) {
    console.error(e)
    throw e
  }
}
