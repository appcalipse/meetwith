import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  keccak,
  pubToAddress,
} from 'ethereumjs-util'
import { NextRequest, NextResponse } from 'next/server'

import { apiUrl, DEFAULT_MESSAGE } from '../../../utils/constants'

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
