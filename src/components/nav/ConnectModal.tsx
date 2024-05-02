import { Box, Portal } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'
import { createThirdwebClient } from 'thirdweb'
import {
  AutoConnect,
  ConnectEmbed,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from 'thirdweb/react'
import { createWallet, embeddedWallet, Wallet } from 'thirdweb/wallets'

import { AccountContext } from '@/providers/AccountProvider'
import { WalletModalContext } from '@/providers/WalletModalProvider'
import { useLogin } from '@/session/login'

export const thirdWebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_ID!,
  config: {
    storage: {
      gatewayUrl: 'https://mww.infura-ipfs.io',
    },
  },
})

export const ConnectModal: React.FC = ({}) => {
  const { isOpen, close } = useContext(WalletModalContext)
  const { handleLogin } = useLogin()

  const { currentAccount, logged, logout } = useContext(AccountContext)
  const [tryingToConnect, setTryingToConnect] = useState(false)

  const wallet = useActiveWallet()

  wallet?.subscribe('accountChanged', async account => {
    if (!account || !account.address || !currentAccount || !logged) {
      return
    }
    await doLogin(wallet)
  })

  const { disconnect } = useDisconnect()
  const status = useActiveWalletConnectionStatus()

  useEffect(() => {
    if (!tryingToConnect && status === 'connecting') {
      setTryingToConnect(true)
    }
    if (tryingToConnect && status === 'connected') {
      setTryingToConnect(false)
      if (!logged && wallet && wallet.getAccount()) {
        wallet && disconnect(wallet)
        logout(wallet)
      } else if (logged && wallet) {
        doLogin(wallet)
      }
    } else if (tryingToConnect && status === 'disconnected' && logged) {
      logout()
    }
  }, [status, wallet, logged])

  const wallets = [
    embeddedWallet(),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
    createWallet('me.rainbow'),
  ]

  const doLogin = async (wallet: Wallet) => {
    if (
      wallet.getAccount() !== undefined &&
      wallet.getAccount()!.address.toLowerCase() !==
        currentAccount?.address.toLowerCase()
    ) {
      await handleLogin(wallet)
    }
  }

  const onConnect = async (wallet: Wallet) => {
    close()
    await doLogin(wallet)
  }

  return isOpen && !logged ? (
    <Portal>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="fixed"
        w="100%"
        h="100%"
        top={0}
        zIndex={1000}
      >
        <Box
          w="100%"
          h="100%"
          top={0}
          position="absolute"
          bgColor="rgba(0, 0, 0, 0.5)"
          onClick={close}
        />
        <ConnectEmbed
          client={thirdWebClient}
          wallets={wallets}
          modalSize="wide"
          showThirdwebBranding={false}
          showAllWallets={false}
          onConnect={onConnect}
        />
      </Box>
    </Portal>
  ) : (
    <AutoConnect wallets={wallets} client={thirdWebClient} />
  )
}
