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
        name: 'Meetwith',
        description: 'Meetwith Wallet Connect client',
        url: 'https://meetwith.xyz',
        icons: [
          'https://mww-public.s3.eu-west-1.amazonaws.com/email/logo_mail.png',
        ],
      },
    })
    return walletKit
  }

  return walletKit
}
