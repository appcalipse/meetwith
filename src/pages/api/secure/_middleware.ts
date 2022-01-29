import { NextRequest, NextResponse } from 'next/server'

import { apiUrl } from '../../../utils/constants'
import { checkSignature } from '../../../utils/cryptography'

export async function middleware(req: NextRequest) {
  const notAuthorized = new Response('Auth required', {
    status: 401,
  })
  const sig = req.headers.get('signature')
  const account = req.headers.get('account')

  if (!sig || !account) return notAuthorized

  try {
    //TODO remove this shitty from edge functions so no api for nonce have to exist
    const response = await (
      await fetch(`${apiUrl}/accounts/nonce_hidden/${account}`)
    ).json()

    const recovered = checkSignature(sig, response.nonce! as number)

    if (account.toLowerCase() !== recovered.toLowerCase()) return notAuthorized

    return NextResponse.next()
  } catch (e) {
    console.error(e)
    throw e
  }
}
