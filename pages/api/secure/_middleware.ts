import { NextRequest, NextResponse } from 'next/server'
import {
  keccak,
  fromRpcSig,
  ecrecover,
  pubToAddress,
  bufferToHex,
} from 'ethereumjs-util'
import { DEFAULT_MESSAGE } from '../../../utils/constants'
import { getAccountNonce, initDB } from '../../../utils/database'

export async function middleware(req: NextRequest) {
  const notAuthorized = new Response('Auth required', {
    status: 401,
  })
  const sig = req.headers.get('signature')
  const account = req.headers.get('account')

  if (!sig || !account) return notAuthorized

  await initDB()

  const nonce = await getAccountNonce(account)

  const recovered = checkSignature(sig, nonce)

  if (account.toLocaleLowerCase() !== recovered.toLocaleLowerCase())
    return notAuthorized

  return NextResponse.next()
}

function checkSignature(signature: string, nonce: number): string {
  const toVerify =
    '\x19Ethereum Signed Message:\n' + DEFAULT_MESSAGE(nonce).length + DEFAULT_MESSAGE(nonce)
  const buffer = keccak(Buffer.from(toVerify))
  const { v, r, s } = fromRpcSig(signature)
  const pubKey = ecrecover(buffer, v, r, s)
  const addrBuf = pubToAddress(pubKey)
  const addr = bufferToHex(addrBuf)

  return addr
}
