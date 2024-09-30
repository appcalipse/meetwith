import * as crypto from 'crypto'
import CryptoJS from 'crypto-js'
import { decryptWithPrivateKey, Encrypted } from 'eth-crypto'
import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  keccak,
  pubToAddress,
} from 'ethereumjs-util'

import { Account } from '@/types/Account'

import { DEFAULT_MESSAGE } from './constants'

const getContentFromEncrypted = async (
  account: Account,
  signature: string,
  encrypted: Encrypted
): Promise<string> => {
  try {
    const pvtKey = decryptContent(signature, account.encoded_signature)
    return await decryptWithPrivateKey(pvtKey, encrypted)
  } catch (error) {
    console.error(error)
    return ''
  }
}

const encryptContent = (signature: string, data: string): string => {
  const ciphertext = CryptoJS.AES.encrypt(data, signature).toString()
  return ciphertext
}

const decryptContent = (signature: string, encodedData: string): string => {
  if (!signature || signature === '') {
    //if for any reason signature is not available anymore, unlog user
    window.location.assign('/logout')
    return ''
  }
  const message = CryptoJS.AES.decrypt(encodedData, signature).toString(
    CryptoJS.enc.Utf8
  )
  return message
}

const checkSignature = (signature: string, nonce: number): string => {
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

export const mockEncrypted: Encrypted = {
  ciphertext: '',
  ephemPublicKey: '',
  iv: '',
  mac: '',
}

export const simpleHash = (contents: string) =>
  crypto.createHash('md5').update(contents).digest('hex')

export {
  checkSignature,
  decryptContent,
  encryptContent,
  getContentFromEncrypted,
}
