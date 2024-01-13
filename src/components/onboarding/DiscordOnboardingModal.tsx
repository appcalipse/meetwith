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
import { isSameDay, parseISO } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import { FaDiscord } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { discordRedirectUrl, OnboardingSubject } from '@/utils/constants'

let didDiscordInit = false
let didOpenConnectWallet = false

export default function DiscordOnboardingModal({
  callback,
}: {
  callback?: () => void
}) {
  const queryParams = useSearchParams()
  const origin = queryParams.get('origin')

  const { isOpen, onOpen: openOnboardingModal, onClose } = useDisclosure()
  const { setOpen: openLogin } = useModal()

  const { currentAccount } = useContext(AccountContext)

  const [subject, setSubject] = useState<OnboardingSubject>()

  useEffect(() => {
    if (!!currentAccount?.address && !didDiscordInit) {
      if (
        origin === OnboardingSubject.Discord &&
        !currentAccount.discord_account
      ) {
        setSubject(OnboardingSubject.Discord)
        openOnboardingModal()
        didDiscordInit = true
      }
    } else if (
      !currentAccount?.address &&
      !!origin &&
      !didOpenConnectWallet &&
      !isOpen
    ) {
      openLogin(true)
      didOpenConnectWallet = true
    }
  }, [currentAccount, openOnboardingModal, origin, openLogin, subject])

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
              We noticed that you arrived from our Discord Bot message. Would
              you like to connect your account to use our Discord scheduling
              bot?
            </Box>

            <Flex flexDir="column" gap={3}>
              <Button
                leftIcon={<FaDiscord />}
                as="a"
                variant="outline"
                href={`https://discord.com/api/oauth2/authorize?client_id=${
                  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
                }&redirect_uri=${encodeURIComponent(
                  discordRedirectUrl
                )}&response_type=code&scope=identify%20guilds&state=${Buffer.from(
                  JSON.stringify({
                    origin: OnboardingSubject.DiscordConnectedInModal,
                    skipNextSteps:
                      !!currentAccount?.created_at &&
                      !isSameDay(
                        parseISO(
                          currentAccount.created_at as unknown as string
                        ),
                        new Date()
                      ),
                  })
                ).toString('base64')}`}
              >
                Connect Discord
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onClose()
                  if (
                    !!currentAccount?.created_at &&
                    isSameDay(
                      parseISO(currentAccount.created_at as unknown as string),
                      new Date()
                    )
                  ) {
                    callback?.()
                  }
                }}
              >
                Skip for now
              </Button>
            </Flex>
          </ModalContent>
        )}
      </Modal>
    </>
  )
}
