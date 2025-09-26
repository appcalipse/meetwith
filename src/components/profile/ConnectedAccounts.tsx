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
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { FaDiscord, FaTelegram } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { NotificationChannel } from '@/types/AccountNotifications'
import { logEvent } from '@/utils/analytics'
import {
  createTelegramHash,
  deleteDiscordIntegration,
  generateDiscordAccount,
  getDiscordInfo,
  getNotificationSubscriptions,
  getPendingTgConnection,
  getTelegramUserInfo,
  setNotificationSubscriptions,
} from '@/utils/api_helper'
import { discordRedirectUrl, OnboardingSubject } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

const DiscordConnection: React.FC = () => {
  const { updateUser, currentAccount } = useContext(AccountContext)
  const [isDiscordConnected, setIsDiscordConnected] = useState(
    !!currentAccount?.discord_account
  )
  const [connecting, setConnecting] = useState(false)

  const { data: discordInfo, isLoading: loadingDiscordUsername } = useQuery({
    queryKey: ['discordUserInfo', currentAccount?.address],
    queryFn: getDiscordInfo,
    enabled: isDiscordConnected,
    onError: error => {
      handleApiError('Error Fetching Discord Username', error)
    },
  })

  const discordUsername =
    discordInfo?.username || discordInfo?.global_name || 'Unknown'

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
          <Text fontSize="lg" fontWeight="bold" mr={1}>
            Discord
          </Text>
          {isDiscordConnected && (
            <Flex gap={2}>
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
              <HStack borderRadius="6px" px={2} bgColor="#CBD2D9">
                <Box
                  borderRadius="50%"
                  w="8px"
                  h="8px"
                  bgColor="rgba(52, 199, 89, 1)"
                />
                <Text fontSize="xs" color="#131A20">
                  {loadingDiscordUsername ? 'Loading...' : discordUsername}
                </Text>
              </HStack>
            </Flex>
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
          rel="noopener noreferrer"
        >
          Connect
        </Button>
      )}
    </HStack>
  )
}

const TelegramConnection: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const [isTelegramConnected, setIsTelegramConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)

  const { data: telegramInfo, isLoading: loadingTelegramUsername } = useQuery({
    queryKey: ['telegramUserInfo', currentAccount?.address],
    queryFn: getTelegramUserInfo,
    enabled: isTelegramConnected,
    onError: error => {
      handleApiError('Error Fetching Telegram Username', error)
    },
  })

  const telegramUsername =
    telegramInfo?.username || telegramInfo?.first_name || 'Unknown'

  const { showSuccessToast, showErrorToast } = useToastHelpers()

  useEffect(() => {
    const checkTelegramConnection = async () => {
      setCheckingConnection(true)
      if (!currentAccount?.address) {
        setCheckingConnection(false)
        return
      }

      try {
        const subs = await getNotificationSubscriptions()
        const hasTelegramNotification = subs.notification_types.some(
          sub => sub.channel === NotificationChannel.TELEGRAM
        )
        setIsTelegramConnected(hasTelegramNotification)
      } catch (error) {
        console.error('Error checking Telegram connection:', error)
      } finally {
        setCheckingConnection(false)
      }
    }

    checkTelegramConnection()
  }, [currentAccount])

  const handleTgConnect = async () => {
    setConnecting(true)
    logEvent('Connect Telegram')

    try {
      const hash = await createTelegramHash()
      const url = `https://t.me/MeetWithDEVBot?start=${hash.tg_id}`
      window.open(url, '_blank')

      const intervalId = setInterval(async () => {
        const pendingConnection = await getPendingTgConnection()
        if (!pendingConnection) {
          setIsTelegramConnected(true)
          clearInterval(intervalId)
          setConnecting(false)
          showSuccessToast(
            'Telegram Connected',
            'Your Telegram account has been connected'
          )
        }
      }, 5000)

      // If the connection is not established after 5 minutes, show an error toast
      setTimeout(() => {
        clearInterval(intervalId)
        setConnecting(false)
      }, 300000)
    } catch (error) {
      setConnecting(false)
      showErrorToast(
        'Connection Failed',
        'Failed to initiate Telegram connection'
      )
    }
  }

  const handleTgDisconnect = async () => {
    setConnecting(true)
    logEvent('Disconnect Telegram')

    try {
      const sub = await getNotificationSubscriptions()
      const newSubs = sub.notification_types.filter(
        sub => sub.channel !== NotificationChannel.TELEGRAM
      )
      await setNotificationSubscriptions({
        account_address: currentAccount!.address,
        notification_types: newSubs,
      })
      setIsTelegramConnected(false)
      setConnecting(false)
      showSuccessToast(
        'Telegram Disconnected',
        'Your Telegram account has been disconnected'
      )
    } catch (error) {
      setConnecting(false)
      showErrorToast(
        'Disconnection Failed',
        'Failed to disconnect Telegram account'
      )
    }
  }

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
            <Icon as={FaTelegram} color={color} />
          </Flex>
          <Text fontSize="lg" fontWeight="bold" mr={1}>
            Telegram
          </Text>
          {isTelegramConnected && (
            <Flex gap={2}>
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
              <HStack borderRadius="6px" px={2} bgColor="#CBD2D9">
                <Box
                  borderRadius="50%"
                  w="8px"
                  h="8px"
                  bgColor="rgba(52, 199, 89, 1)"
                />
                <Text fontSize="xs" color="#131A20">
                  {loadingTelegramUsername ? 'Loading...' : telegramUsername}
                </Text>
              </HStack>
            </Flex>
          )}
        </HStack>
        <Text opacity="0.5">
          Connect to receive notifications for your meetings.
        </Text>
      </VStack>

      {checkingConnection ? (
        <Button
          variant="outline"
          colorScheme="primary"
          isLoading={true}
          loadingText="Checking..."
        >
          Connect
        </Button>
      ) : isTelegramConnected ? (
        <Button
          variant="ghost"
          colorScheme="primary"
          isLoading={connecting}
          onClick={handleTgDisconnect}
        >
          Disconnect
        </Button>
      ) : (
        <Button
          variant="outline"
          colorScheme="primary"
          isLoading={connecting}
          loadingText="Connecting"
          onClick={handleTgConnect}
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
      <VStack spacing={6} align="stretch">
        <DiscordConnection />
        <TelegramConnection />
      </VStack>
    </>
  )
}

export default ConnectedAccounts
