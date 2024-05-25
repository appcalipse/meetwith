import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { useActiveWallet, useConnect } from 'thirdweb/react'
import { createWallet } from 'thirdweb/wallets' // Import createWallet

import { OnboardingContext } from '@/providers/OnboardingProvider'
import { WalletModalContext } from '@/providers/WalletModalProvider'
import { useLogin } from '@/session/login'
import { loginWithAddress, thirdWebClient } from '@/utils/user_manager'

import { ConnectModal } from '../nav/ConnectModal'

const GroupOnboardingModal = ({
  groupId,
  email,
}: {
  groupId: string
  email: string
}) => {
  const { handleLogin, logged, currentAccount, loginIn, setLoginIn } =
    useLogin()
  const { isOpen, open, close } = useContext(WalletModalContext)
  const { onboardingComplete, isLoaded, reload } = useContext(OnboardingContext)
  const [userState, setUserState] = useState<
    'existing' | 'new_wallet' | 'new_no_wallet' | 'existing_no_wallet'
  >()
  const { connect, isConnecting, error } = useConnect()
  const activeWallet = useActiveWallet()
  const router = useRouter()

  useEffect(() => {
    if (!logged) {
      setUserState('new_no_wallet')
    } else if (currentAccount && currentAccount.address) {
      setUserState('existing')
    } else {
      setUserState('existing_no_wallet')
    }
  }, [logged, currentAccount])

  useEffect(() => {
    if (isLoaded) {
      reload()
    }
  }, [isLoaded, reload])

  const handleConnect = async () => {
    open()
  }

  const handleAcceptInvite = async () => {
    // Logic to accept the invite and join the group
    // After accepting, you might want to redirect the user
    // For example:
    // await acceptGroupInvite(groupId, currentAccount?.address)
    router.push('/dashboard/groups')
  }

  return (
    <>
      <Modal isOpen={true} onClose={() => {}}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Join Group</ModalHeader>
          <ModalBody>
            {userState === 'existing' && (
              <div>
                <Text>
                  You are already logged in. Click below to join the group.
                </Text>
                <Button onClick={handleAcceptInvite}>Join Group</Button>
              </div>
            )}
            {(userState === 'existing_no_wallet' ||
              userState === 'new_wallet') && (
              <div>
                <Text>You need to connect your wallet to proceed.</Text>
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </div>
            )}
            {userState === 'new_no_wallet' && (
              <div>
                <Text>
                  Welcome! Please sign up or connect your wallet to proceed.
                </Text>
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
                <Button onClick={() => router.push('/signup')}>Sign Up</Button>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      <ConnectModal />
    </>
  )
}

export default GroupOnboardingModal
