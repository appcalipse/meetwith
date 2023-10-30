import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react'
import { useModal } from 'connectkit'
import { useSearchParams } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'

import { AccountContext } from '../../providers/AccountProvider'

export enum OnboardingSubject {
  Discord,
}

let didDiscordInit = false
let didOpenConnectWallet = false

export default function OnboardingModal() {
  const queryParams = useSearchParams()
  const origin = queryParams.get('origin')
  console.log({ origin })

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { setOpen } = useModal()

  const { currentAccount } = useContext(AccountContext)

  const [subject, setSubject] = useState<OnboardingSubject>()

  useEffect(() => {
    if (!!currentAccount?.address && !didDiscordInit) {
      console.log({ currentAccount })
      if (origin === 'discord' && !currentAccount.discord_account) {
        setSubject(OnboardingSubject.Discord)
        onOpen()
        didDiscordInit = true
      }
    } else if (!!origin && !didOpenConnectWallet) {
      console.log({ currentAccount, origin })
      setOpen(true)
      didOpenConnectWallet = true
    }
  }, [currentAccount, onOpen, origin, setOpen, subject])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={false}
        closeOnEsc={false}
        size="xl"
      >
        <ModalOverlay />
        {subject === OnboardingSubject.Discord && (
          <ModalContent padding={20} maxW="45rem">
            <Flex fontSize={39} justifyContent="center">
              Welcome from Discord!
            </Flex>
            <ModalBody>Lorem FDP</ModalBody>

            <ModalFooter>
              <Button onClick={onClose}>Close</Button>
              <Button>Secondary Action</Button>
            </ModalFooter>
          </ModalContent>
        )}
      </Modal>
    </>
  )
}
