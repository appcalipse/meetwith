import * as PushAPI from '@pushprotocol/restapi'
import * as Sentry from '@sentry/nextjs'
import { ethers } from 'ethers'

export const PUSH_CHANNEL = '0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b'
export const sendPushNotification = async (
  destination_address: string,
  title: string,
  message: string
): Promise<boolean> => {
  const Pkey = `0x${process.env.BACKEND_NOTIFIER_WALLET_PVT_KEY!}`
  const signer = new ethers.Wallet(Pkey)

  try {
    const apiResponse = await PushAPI.payloads.sendNotification({
      signer,
      type: 3, // target
      identityType: 2, // direct payload
      notification: {
        title,
        body: message,
      },
      payload: {
        title,
        body: message,
        cta: 'https://meetwithwallet.xyz',
        img: '',
      },
      recipients: [getCAIPAddress(destination_address)],
      channel: getCAIPAddress(PUSH_CHANNEL),
      env: process.env.NEXT_PUBLIC_ENV === 'production' ? 'prod' : 'staging',
    })
    if (apiResponse?.status === 204) {
      return true
    }
  } catch (error) {
    Sentry.captureException(error)
  }

  return false
}

export const getCAIPAddress = (address: string): string => {
  return `eip155:${
    process.env.NEXT_PUBLIC_ENV === 'production' ? '1' : '5'
  }:${address}`
}
