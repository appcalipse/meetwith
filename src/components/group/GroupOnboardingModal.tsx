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
import { useEffect, useState } from 'react'
import { Wallet } from 'thirdweb/wallets'

import { useLogin } from '@/session/login'
import { loginWithAddress, thirdWebClient } from '@/utils/user_manager'

const GroupOnboardingModal = ({
  groupId,
  email,
}: {
  groupId: string
  email: string
}) => {
  const { handleLogin, logged, currentAccount, loginIn } = useLogin()
  const [userState, setUserState] = useState<
    'existing' | 'new_wallet' | 'new_no_wallet' | 'existing_no_wallet'
  >()
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

  const handleWalletConnect = async () => {
    const wallet = new Wallet(thirdWebClient)
    await loginWithAddress(wallet, loginIn)
    if (logged) {
      setUserState('existing')
    }
  }

  const handleAcceptInvite = async () => {
    // Logic to accept the invite and join the group
    // After accepting, you might want to redirect the user
  }

  return (
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
          {userState === 'existing_no_wallet' && (
            <div>
              <Text>You need to connect your wallet to proceed.</Text>
              <Button onClick={handleWalletConnect}>Connect Wallet</Button>
            </div>
          )}
          {userState === 'new_wallet' && (
            <div>
              <Text>Welcome! Connect your wallet to get started.</Text>
              <Button onClick={handleWalletConnect}>Connect Wallet</Button>
            </div>
          )}
          {userState === 'new_no_wallet' && (
            <div>
              <Text>
                Welcome! Please sign up or connect your wallet to proceed.
              </Text>
              <Button onClick={handleWalletConnect}>Connect Wallet</Button>
              <Button onClick={() => router.push('/signup')}>Sign Up</Button>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GroupOnboardingModal
