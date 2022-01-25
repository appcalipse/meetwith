import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  keccak,
  pubToAddress,
} from 'ethereumjs-util'
import { unsealData } from 'iron-session'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'

import { Account } from '../../../types/Account'
import { AccountSession } from '../../../types/Session'
import {
  SESSION_COOKIE_NAME,
  sessionOptions,
} from '../../../utils/auth/withSessionApiRoute'
import { apiUrl, DEFAULT_MESSAGE } from '../../../utils/constants'

const notAuthorized = new Response('Auth required', {
  status: 401,
})

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const ironSessionCookie = req.cookies[SESSION_COOKIE_NAME]

  if (!ironSessionCookie) {
    console.log('No cookie found!')
    return notAuthorized
  }

  const session = (await unsealData(ironSessionCookie, sessionOptions)) as {
    account: AccountSession
  }
  const sig = req.headers.get('signature')
  const account = req.headers.get('account')

  if (!sig || !account) return notAuthorized

  if (sig !== session?.account?.signature) {
    console.error('signature not matching', sig, session?.account?.signature)
    return notAuthorized
  }

  if (account !== session?.account?.address.toLowerCase()) {
    console.error(
      'account not matching',
      account,
      session?.account?.address.toLowerCase()
    )
    return notAuthorized
  }

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

function checkSignature(signature: string, nonce: number): string {
  const toVerify =
    '\x19Ethereum Signed Message:\n' +
    DEFAULT_MESSAGE(nonce).length +
    DEFAULT_MESSAGE(nonce)
  const buffer = keccak(Buffer.from(toVerify))
  const { v, r, s } = fromRpcSig(signature)
  const pubKey = ecrecover(buffer, v, r, s)
  const addrBuf = pubToAddress(pubKey)
  const addr = bufferToHex(addrBuf)

  return addr
}
