'use client'

import {
  Box,
  Button,
  Flex,
  Modal,
  ModalContent,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react'
import { useModal } from 'connectkit'
import { useSearchParams } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa'

import { discordRedirectUrl, OnboardingSubject } from '@/utils/constants'

import { AccountContext } from '../../providers/AccountProvider'

let didDiscordInit = false
let didOpenConnectWallet = false

export default function DiscordOnboardingModal({
  callback,
}: {
  callback?: () => void
}) {
  const queryParams = useSearchParams()
  const origin = queryParams.get('origin')

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { setOpen } = useModal()

  const { currentAccount } = useContext(AccountContext)

  const [subject, setSubject] = useState<OnboardingSubject>()

  useEffect(() => {
    if (!!currentAccount?.address && !didDiscordInit) {
      if (
        origin === OnboardingSubject.Discord &&
        !currentAccount.discord_account
      ) {
        setSubject(OnboardingSubject.Discord)
        onOpen()
        didDiscordInit = true
      }
    } else if (
      !currentAccount?.address &&
      !!origin &&
      !didOpenConnectWallet &&
      !isOpen
    ) {
      console.log('discord modal')
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
            <Flex fontSize={39} fontWeight="bold" marginBottom={6}>
              Welcome from Discord!
            </Flex>

            <Box fontSize={18} marginBottom={10}>
              We noticed that you arrived from our bot Discord message. Would
              you like to connect your account to enable our Discord scheduling
              bot?
            </Box>

            <Flex flexDir="column" gap={3}>
              <Button
                leftIcon={<FaDiscord />}
                as="a"
                // isLoading={connecting}
                loadingText="Connecting"
                variant="outline"
                // onClick={() => setConnecting(true)}
                href={`https://discord.com/api/oauth2/authorize?client_id=${
                  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
                }&redirect_uri=${encodeURIComponent(
                  discordRedirectUrl
                )}&response_type=code&scope=identify%20guilds&state=${Buffer.from(
                  JSON.stringify({
                    origin: OnboardingSubject.DiscordConnectedInModal,
                  })
                ).toString('base64')}`}
              >
                Connect Discord
              </Button>
              <Button variant="ghost" onClick={callback}>
                Skip for now
              </Button>
            </Flex>
          </ModalContent>
        )}
      </Modal>
    </>
  )
}
