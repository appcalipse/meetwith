import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { FaDiscord } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import {
  deleteDiscordIntegration,
  generateDiscordAccount,
} from '@/utils/api_helper'
import { discordRedirectUrl, OnboardingSubject } from '@/utils/constants'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

const DiscordConnection: React.FC = () => {
  const { updateUser, currentAccount } = useContext(AccountContext)
  const [isDiscordConnected, setIsDiscordConnected] = useState(
    !!currentAccount?.discord_account
  )
  const [connecting, setConnecting] = useState(false)

  const toast = useToast()

  const router = useRouter()

  const disconnect = async () => {
    setConnecting(true)
    await deleteDiscordIntegration()
    await queryClient.invalidateQueries(
      QueryKeys.account(currentAccount?.address?.toLowerCase())
    )
    await updateUser()
    setConnecting(false)
    toast({
      title: 'Discord disconnected',
      description: 'Your Discord account has been disconnected',
      status: 'success',
      duration: 3000,
      position: 'top',
      isClosable: true,
    })
    setIsDiscordConnected(false)
  }

  const generateDiscord = async () => {
    const { code, state } = router.query

    const origin = state
      ? (JSON.parse(Buffer.from(state as string, 'base64').toString())
          ?.origin as OnboardingSubject | undefined)
      : undefined

    if (origin && code) {
      setConnecting(true)
      const uri = window.location.href.toString()
      if (uri.indexOf('?') > 0) {
        const clean_uri = uri.substring(0, uri.indexOf('?'))
        window.history.replaceState({}, document.title, clean_uri)
      }
      try {
        await generateDiscordAccount(code as string)
        await updateUser()
        setIsDiscordConnected(true)
        toast({
          title: 'Discord Connected',
          description: 'Your Discord account has been connected',
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      } catch (error) {}
      setConnecting(false)
    }
  }

  useEffect(() => {
    generateDiscord()
  }, [])

  const bgColor = useColorModeValue('gray.800', 'white')
  const badgeColor = useColorModeValue('gray.600', 'gray.500')
  const color = useColorModeValue('white', 'gray.800')

  return (
    <HStack>
      <VStack flex={1} alignItems="flex-start">
        <HStack>
          <Flex
            width="22px"
            height="22px"
            bgColor={bgColor}
            borderRadius="50%"
            justifyContent="center"
            alignItems="center"
          >
            <Icon as={FaDiscord} color={color} />
          </Flex>
          <Text fontSize="lg" fontWeight="bold">
            Discord
          </Text>
          {isDiscordConnected && (
            <HStack borderRadius="6px" px={2} bgColor={badgeColor}>
              <Box
                borderRadius="50%"
                w="8px"
                h="8px"
                bgColor="rgba(52, 199, 89, 1)"
              />
              <Text fontSize="xs" color="white">
                Connected
              </Text>
            </HStack>
          )}
        </HStack>
        <Text opacity="0.5">
          Connect to enable notifications and Discord bot commands
        </Text>
      </VStack>

      {isDiscordConnected ? (
        <Button
          variant="ghost"
          colorScheme="primary"
          isLoading={connecting}
          onClick={disconnect}
        >
          Disconnect
        </Button>
      ) : (
        <Button
          as="a"
          isLoading={connecting}
          loadingText="Connecting"
          variant="outline"
          colorScheme="primary"
          onClick={() => setConnecting(true)}
          href={`https://discord.com/api/oauth2/authorize?client_id=${
            process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
          }&redirect_uri=${encodeURIComponent(
            discordRedirectUrl
          )}&response_type=code&scope=identify%20guilds&state=${Buffer.from(
            JSON.stringify({ origin: OnboardingSubject.DiscordConnectedInPage })
          ).toString('base64')}`}
        >
          Connect
        </Button>
      )}
    </HStack>
  )
}

const ConnectedAccounts: React.FC = () => {
  return (
    <>
      <Heading id="connected" fontSize="2xl" mb={8}>
        Connected Accounts
      </Heading>
      <DiscordConnection />
    </>
  )
}

export default ConnectedAccounts
