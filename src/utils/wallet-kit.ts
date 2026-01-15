import { IWalletKit, WalletKit } from '@reown/walletkit'
import { Core } from '@walletconnect/core'

process.env.DISABLE_GLOBAL_CORE = 'true'
const core = new Core({
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
})

let walletKit: IWalletKit | null = null

export async function getWalletKit() {
  if (!walletKit) {
    walletKit = await WalletKit.init({
      core,
      metadata: {
        description: 'Meetwith Wallet Connect client',
        icons: [
          'https://mww-public.s3.eu-west-1.amazonaws.com/email/logo_mail.png',
        ],
        name: 'Meetwith',
        url: 'https://meetwith.xyz',
      },
    })
    return walletKit
  }

  return walletKit
}
