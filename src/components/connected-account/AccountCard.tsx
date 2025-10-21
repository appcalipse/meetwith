import {
  Box,
  Button,
  HStack,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  VStack,
} from '@chakra-ui/react'
import { NotificationChannel } from '@meta/AccountNotifications'
import { ConnectedAccount, ConnectedAccountInfo } from '@meta/ConnectedAccounts'
import { logEvent } from '@utils/analytics'
import {
  createTelegramHash,
  deleteDiscordIntegration,
  disconnectStripeAccount,
  getNotificationSubscriptions,
  getPendingTgConnection,
  getStripeOnboardingLink,
  setNotificationSubscriptions,
} from '@utils/api_helper'
import { discordRedirectUrl, OnboardingSubject } from '@utils/constants'
import QueryKeys from '@utils/query_keys'
import { queryClient } from '@utils/react_query'
import { useToastHelpers } from '@utils/toasts'
import Image from 'next/image'
import React, { FC, useContext } from 'react'
import { GoDotFill } from 'react-icons/go'

import useAccountContext from '@/hooks/useAccountContext'
import { AccountContext } from '@/providers/AccountProvider'

type IProps = ConnectedAccountInfo
const getContent = (connect_account: ConnectedAccount) => {
  switch (connect_account) {
    case ConnectedAccount.STRIPE:
      return 'Collect payment for sessions using your Stripe account.'
    case ConnectedAccount.DISCORD:
      return 'Connect your Discord to enable notifications and Discord bot commands'
    case ConnectedAccount.TELEGRAM:
      return 'Connect to receive notifications for your meetings.'
    default:
      return null
  }
}
const AccountCard: FC<IProps> = props => {
  const [isDisconnecting, setDisconnecting] = React.useState(false)
  const { updateUser, currentAccount } = useContext(AccountContext)

  const [isConnecting, setIsConnecting] = React.useState(false)
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  const handleTgDisconnect = async () => {
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
      showSuccessToast(
        'Telegram Disconnected',
        'Your Telegram account has been disconnected'
      )
    } catch (error) {
      showErrorToast(
        'Disconnection Failed',
        'Failed to disconnect Telegram account'
      )
    }
  }
  const handleDiscordDisconnect = async () => {
    await deleteDiscordIntegration()
    await queryClient.invalidateQueries(
      QueryKeys.account(currentAccount?.address?.toLowerCase())
    )
    await updateUser()
    showSuccessToast(
      'Discord Disconnected',
      'Your Discord account has been disconnected'
    )
  }
  const handleStripeDisconnect = async () => {
    logEvent('Disconnect Stripe')
    try {
      await disconnectStripeAccount()
      showSuccessToast(
        'Stripe Disconnected',
        'Your Stripe account has been disconnected'
      )
    } catch (e) {
      showErrorToast(
        'Disconnection Failed',
        'Failed to disconnect Stripe account'
      )
    }
  }
  const handleDisconnect = async () => {
    setDisconnecting(true)
    switch (props.account) {
      case ConnectedAccount.TELEGRAM:
        await handleTgDisconnect()
        break
      case ConnectedAccount.DISCORD:
        await handleDiscordDisconnect()
        break
      case ConnectedAccount.STRIPE:
        await handleStripeDisconnect()
    }
    await queryClient.invalidateQueries(
      QueryKeys.connectedAccounts(currentAccount?.address)
    )
    setDisconnecting(false)
  }
  const handleTgConnect = async () => {
    return new Promise<boolean>(async resolve => {
      setIsConnecting(true)
      logEvent('Connect Telegram')

      try {
        const hash = await createTelegramHash()
        const url = `https://t.me/MeetWithDEVBot?start=${hash.tg_id}`
        window.open(url, '_blank', 'noopener noreferrer')

        const intervalId = setInterval(async () => {
          const pendingConnection = await getPendingTgConnection()
          if (!pendingConnection) {
            clearInterval(intervalId)
            resolve(true)
            showSuccessToast(
              'Telegram Connected',
              'Your Telegram account has been connected'
            )
          }
        }, 5000)

        // If the connection is not established after 5 minutes, show an error toast
        setTimeout(() => {
          clearInterval(intervalId)
          setIsConnecting(false)
          showErrorToast(
            'Connection Failed',
            'Could not verify Telegram connection in time. Please try again.'
          )
          resolve(false)
        }, 300000)
      } catch (error) {
        setIsConnecting(false)
        showErrorToast(
          'Connection Failed',
          'Failed to initiate Telegram connection'
        )
      }
    })
  }
  const handleDiscordConnect = async () => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${
      process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      discordRedirectUrl
    )}&response_type=code&scope=identify%20guilds&state=${Buffer.from(
      JSON.stringify({ origin: OnboardingSubject.DiscordConnectedInPage })
    ).toString('base64')}`
    window.open(url, '_self', 'noopener noreferrer')
  }
  const handleStripeConnect = async () => {
    const url = await getStripeOnboardingLink()
    window.open(url, '_self', 'noopener noreferrer')
  }
  const handleConnect = async () => {
    setIsConnecting(true)
    let isSuccessful = true
    switch (props.account) {
      case ConnectedAccount.TELEGRAM:
        isSuccessful = await handleTgConnect()
        break
      case ConnectedAccount.DISCORD:
        await handleDiscordConnect()
        break
      case ConnectedAccount.STRIPE:
        await handleStripeConnect()
        break
    }
    if (isSuccessful) {
      await queryClient.invalidateQueries(
        QueryKeys.connectedAccounts(currentAccount?.address)
      )
    }
    setIsConnecting(false)
  }
  return (
    <VStack
      alignItems="flex-start"
      spacing={4}
      mb={4}
      borderRadius={10}
      border={'1px'}
      borderColor="neutral.800"
      borderStyle="solid"
      p={7}
    >
      <HStack w={'100%'} justifyContent={'space-between'}>
        <Image
          src={`/assets/connected-accounts/${props.account}.png`}
          alt={props.account.toUpperCase()}
          width={50}
          height={50}
        />
        {props.info && (
          <HStack>
            <Tag variant="subtle" bg="neutral.400">
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                m={0}
                color="green.500"
              />
              <TagLabel px="2px">Connected</TagLabel>
            </Tag>
            <Tag variant="subtle" bg="neutral.200">
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                m={0}
                color="green.500"
              />
              <TagLabel px="2px" color={'neutral.900'}>
                {props.info?.username}
              </TagLabel>
            </Tag>
          </HStack>
        )}
      </HStack>
      <Text color={'neutral.300'} fontWeight={500}>
        {getContent(props.account)}
      </Text>
      {props.info ? (
        <Button
          colorScheme="primary"
          isLoading={isDisconnecting}
          loadingText="Disconnecting..."
          onClick={handleDisconnect}
          variant="outline"
          px={6}
          fontWeight={700}
          textTransform="capitalize"
        >
          {`Disconnect ${props.account}`}
        </Button>
      ) : (
        <Button
          colorScheme="primary"
          isLoading={isConnecting}
          loadingText="Connecting..."
          onClick={handleConnect}
          px={6}
          fontWeight={700}
          textTransform="capitalize"
        >
          {`Connect ${props.account}`}
        </Button>
      )}
    </VStack>
  )
}

export default AccountCard
