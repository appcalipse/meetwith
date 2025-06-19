import { useEffect, useState } from 'react'
import {
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useConnect,
} from 'thirdweb/react'
import { createWallet, WalletId } from 'thirdweb/wallets'

import useAccountContext from '@/hooks/useAccountContext'
import { isJson } from '@/utils/generic_utils'
import { thirdWebClient } from '@/utils/user_manager'

export const useSmartReconnect = () => {
  const connect = useConnect()
  const currentAccount = useAccountContext()
  const address = currentAccount?.address || null
  const connectionStatus = useActiveWalletConnectionStatus()
  // eslint-disable-next-line no-restricted-syntax
  console.log({ connectionStatus }, 'connectionStatus')
  const wallet = useActiveWallet()
  const [needsReconnection, setNeedsReconnection] = useState(false)
  const [lastKnownWallet, setLastKnownWallet] = useState<string | null>(null)

  useEffect(() => {
    // Check if user was previously connected
    const lastWalletRaw = localStorage.getItem('thirdweb:connected-wallet-ids')

    const lastWallets = lastWalletRaw
      ? isJson(lastWalletRaw)
        ? JSON.parse(lastWalletRaw)
        : lastWalletRaw
      : []

    const lastWallet = lastWallets.length > 0 ? lastWallets.at(-1) : null

    if (
      lastWallet &&
      !wallet &&
      address &&
      connectionStatus === 'disconnected'
    ) {
      setNeedsReconnection(true)
      setLastKnownWallet(lastWallet)
    }
  }, [address, connectionStatus])
  const attemptReconnection = async () => {
    if (!lastKnownWallet) return null

    try {
      const wallet = connect.connect(async () => {
        // create a wallet instance
        const wallet = createWallet(lastKnownWallet as WalletId)
        // trigger the connection
        await wallet.connect({ client: thirdWebClient })
        // return the wallet
        return wallet
      })
      setNeedsReconnection(false)
      return wallet
    } catch (error) {
      return null
    }
  }

  return {
    needsReconnection,
    lastKnownWallet,
    attemptReconnection,
    clearReconnectionState: () => setNeedsReconnection(false),
  }
}
