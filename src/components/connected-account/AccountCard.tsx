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
  generateDashboardLink,
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

type DisconnectHandler = () => Promise<unknown>

interface DisconnectConfig {
  handler: DisconnectHandler
  errorMessage: string
  logEvent?: boolean
  disableSuccessAction?: boolean
}

import usePoller from '@/hooks/usePoller'
import { AccountContext } from '@/providers/AccountProvider'
import {
  ActivePaymentAccount,
  PaymentAccountStatus,
} from '@/types/PaymentAccount'
import { Enums } from '@/types/Supabase'

interface IProps extends ConnectedAccountInfo {
  openSelectCountry: () => void
}
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
const getIconColor = (status: Enums<'PaymentAccountStatus'>) => {
  switch (status) {
    case PaymentAccountStatus.CONNECTED:
      return 'green.500'
    case PaymentAccountStatus.PENDING:
      return 'yellow.500'
    case PaymentAccountStatus.FAILED:
      return 'red.500'
    default:
      return 'green.500'
  }
}
const AccountCard: FC<IProps> = props => {
  const [isDisconnecting, setDisconnecting] = React.useState(false)
  const { updateUser, currentAccount } = useContext(AccountContext)

  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = React.useState(false)
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const poll = usePoller()
  const disconnectConfigs: Record<ConnectedAccount, DisconnectConfig> = {
    [ConnectedAccount.TELEGRAM]: {
      handler: async () => {
        const sub = await getNotificationSubscriptions()
        const newSubs = sub.notification_types.filter(
          sub => sub.channel !== NotificationChannel.TELEGRAM
        )
        await setNotificationSubscriptions({
          account_address: currentAccount!.address,
          notification_types: newSubs,
        })
      },
      errorMessage: 'Failed to disconnect Telegram account',
      logEvent: true,
    },
    [ConnectedAccount.DISCORD]: {
      handler: async () => {
        await deleteDiscordIntegration()
        await updateUser()
      },
      errorMessage: 'Failed to disconnect Discord account',
      logEvent: true,
    },
    [ConnectedAccount.STRIPE]: {
      handler: async () => {
        await disconnectStripeAccount()
      },
      errorMessage: 'Failed to disconnect Stripe account',
      logEvent: true,
    },
  }

  const executeDisconnect = async (
    accountType: ConnectedAccount,
    onError: (msg: string) => void
  ): Promise<boolean> => {
    const config = disconnectConfigs[accountType]
    if (!config) {
      throw new Error(`Unknown account type: ${accountType}`)
    }

    try {
      if (config.logEvent) {
        logEvent(`Disconnect ${accountType}`)
      }
      await config.handler()
      return true
    } catch (error) {
      console.error(config.errorMessage, error)
      onError(config.errorMessage)
      return false
    }
  }
  const connectConfigs: Record<ConnectedAccount, DisconnectConfig> = {
    [ConnectedAccount.TELEGRAM]: {
      handler: async () => {
        // TODO: Check if account has been already successfully connected
        const hash = await createTelegramHash()
        const url = `https://t.me/MeetWithDEVBot?start=${hash.tg_id}`
        window.open(url, '_blank', 'noopener noreferrer')
        const abortController = new AbortController()
        const timeoutMs = 5 * 60 * 1000 // 5 minutes
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        try {
          await Promise.race([
            poll(
              async () => {
                const pendingConnection = await getPendingTgConnection()
                return { completed: !pendingConnection }
              },
              abortController.signal,
              5000
            ),
            new Promise((_res, reject) => {
              timeoutId = setTimeout(() => {
                abortController.abort()
                reject(new Error('Telegram connection timeout'))
              }, timeoutMs)
            }),
          ])
          return true
        } finally {
          if (timeoutId) clearTimeout(timeoutId)
        }
      },
      errorMessage:
        'Could not verify Telegram connection in time. Please try again.',
      logEvent: true,
    },
    [ConnectedAccount.DISCORD]: {
      handler: async () => {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${
          process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
        }&redirect_uri=${encodeURIComponent(
          discordRedirectUrl
        )}&response_type=code&scope=identify%20guilds&state=${Buffer.from(
          JSON.stringify({ origin: OnboardingSubject.DiscordConnectedInPage })
        ).toString('base64')}`
        window.open(url, '_self')
      },
      errorMessage: 'Discord Connection error, Please retry',
      logEvent: true,
    },
    [ConnectedAccount.STRIPE]: {
      handler: async () => props.openSelectCountry(),
      errorMessage: 'Stripe Connection error, Please retry',
      logEvent: true,
      disableSuccessAction: true,
    },
  }
  const handleUpdateDetails = async () => {
    const url = await getStripeOnboardingLink()
    window.open(url, '_self')
  }
  const executeConnect = async (
    accountType: ConnectedAccount,
    onError: (msg: string) => void
  ): Promise<boolean> => {
    const config = connectConfigs[accountType]
    if (!config) {
      throw new Error(`Unknown account type: ${accountType}`)
    }
    try {
      if (config.logEvent) {
        logEvent(`Connect ${accountType}`)
      }
      await config.handler()
      return !config.disableSuccessAction
    } catch (error) {
      console.error(config.errorMessage, error)
      onError(config.errorMessage)
      return false
    }
  }
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)

      const isSuccessful = await executeDisconnect(props.account, msg =>
        showErrorToast('Disconnection Failed', msg)
      )

      if (isSuccessful) {
        await queryClient.invalidateQueries(
          QueryKeys.connectedAccounts(currentAccount?.address)
        )
      }
      showSuccessToast(
        `${props.account} Disconnected`,
        `Your ${props.account} account has been disconnected`
      )
    } finally {
      setDisconnecting(false)
    }
  }
  const handleConnect = async () => {
    try {
      setIsConnecting(true)

      const isSuccessful = await executeConnect(props.account, msg =>
        showErrorToast('Connection Failed', msg)
      )

      if (isSuccessful) {
        await queryClient.invalidateQueries(
          QueryKeys.connectedAccounts(currentAccount?.address)
        )
        showSuccessToast(
          `${props.account} Connected`,
          `Your ${props.account} account has been connected`
        )
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const isPaymentAccount = (
    account: ConnectedAccountInfo
  ): account is {
    account: ConnectedAccount.STRIPE
    info: ActivePaymentAccount
  } => {
    if (account.info && 'provider' in account.info) {
      return true
    }
    return false
  }
  const handleOpenDashboardLink = async () => {
    try {
      setIsGeneratingLink(true)
      const url = await generateDashboardLink()
      window.open(url, '_blank', 'noopener noreferrer')
    } catch (_e) {
      showErrorToast('Failed to open dashboard', 'Please try again later.')
    } finally {
      setIsGeneratingLink(false)
    }
  }
  return (
    <VStack
      alignItems="flex-start"
      spacing={4}
      mb={4}
      borderRadius={10}
      border={'1px'}
      borderColor="card-border"
      borderStyle="solid"
      p={7}
      justifyContent="space-between"
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
            <Tag
              variant="subtle"
              bg="input-border"
              fontSize={{
                lg: '16px',
                md: '14px',
                base: '12px',
              }}
            >
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                m={0}
                color={
                  isPaymentAccount(props)
                    ? getIconColor(props.info.status)
                    : 'green.500'
                }
              />
              <TagLabel px="2px" textTransform="capitalize">
                {isPaymentAccount(props) ? props.info.status : 'Connected'}
              </TagLabel>
            </Tag>
            <Tag
              variant="subtle"
              bg="text-highlight-primary"
              fontSize={{
                lg: '16px',
                md: '14px',
                base: '12px',
              }}
            >
              <TagLeftIcon
                boxSize="12px"
                w={5}
                h={5}
                as={GoDotFill}
                m={0}
                color="green.500"
              />
              <TagLabel px="2px" color={'bg-surface'}>
                {props.info?.username}
              </TagLabel>
            </Tag>
          </HStack>
        )}
      </HStack>
      <Text color={'neutral.300'} fontWeight={500}>
        {getContent(props.account)}
      </Text>
      <HStack>
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
        {isPaymentAccount(props) &&
          ([PaymentAccountStatus.FAILED, PaymentAccountStatus.PENDING].includes(
            props.info.status as PaymentAccountStatus
          ) ? (
            <Button
              colorScheme="primary"
              isLoading={isConnecting}
              onClick={handleUpdateDetails}
              px={6}
              fontWeight={700}
              textTransform="capitalize"
              variant="link"
            >
              Update Details
            </Button>
          ) : (
            <Button
              colorScheme="primary"
              isLoading={isGeneratingLink}
              loadingText="Opening..."
              onClick={handleOpenDashboardLink}
              px={6}
              fontWeight={700}
              textTransform="capitalize"
              variant="link"
            >
              View My Dashboard
            </Button>
          ))}
      </HStack>
    </VStack>
  )
}

export default AccountCard
