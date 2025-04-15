import { Box, Portal } from '@chakra-ui/react'
import * as Sentry from '@sentry/nextjs'
import { useContext, useEffect, useState } from 'react'
import {
  AutoConnect,
  ConnectEmbed,
  darkTheme,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from 'thirdweb/react'
import { createWallet, inAppWallet, Wallet } from 'thirdweb/wallets'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useLogin } from '@/session/login'
import { thirdWebClient } from '@/utils/user_manager'

export const ConnectModal: React.FC = ({}) => {
  const { isConnectionOpened, closeConnection, redirectPath, shouldRedirect } =
    useContext(OnboardingModalContext)
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
    try {
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
    } catch (e) {
      Sentry.captureException(e)
    }
  }, [status, wallet, logged])

  const wallets = [
    inAppWallet({
      auth: {
        options: ['email', 'google', 'phone', 'passkey'],
      },
    }),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
    createWallet('me.rainbow'),
    createWallet('walletConnect'),
  ]

  const doLogin = async (wallet: Wallet) => {
    try {
      if (
        wallet.getAccount() !== undefined &&
        wallet.getAccount()!.address.toLowerCase() !==
          currentAccount?.address.toLowerCase()
      ) {
        await handleLogin(
          wallet,
          undefined,
          undefined,
          shouldRedirect,
          redirectPath
        )
      }
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  const onConnect = async (wallet: Wallet) => {
    closeConnection()
    await doLogin(wallet)
  }

  return isConnectionOpened && !logged ? (
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
          onClick={closeConnection}
        />
        <ConnectEmbed
          client={thirdWebClient}
          wallets={wallets}
          theme={darkTheme({
            colors: {
              accentText: '#F35826',
              accentButtonBg: '#F35826',
            },
          })}
          modalSize="wide"
          showThirdwebBranding={false}
          showAllWallets={false}
          onConnect={onConnect}
          appMetadata={{
            name: 'Meetwith',
            url: 'https://meetwith.xyz',
            description: 'Meetwith is the web3 tailored scheduling tool.',
            logoUrl: 'https://meetwith.xyz/assets/logo.svg',
          }}
          walletConnect={{
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
          }}
        />
      </Box>
    </Portal>
  ) : (
    <AutoConnect
      appMetadata={{
        name: 'Meetwith',
        url: 'https://meetwith.xyz',
        description: 'Meetwith is the web3 tailored scheduling tool.',
        logoUrl: 'https://meetwith.xyz/assets/logo.svg',
      }}
      wallets={wallets}
      client={thirdWebClient}
    />
  )
}
