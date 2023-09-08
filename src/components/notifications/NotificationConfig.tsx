import { Link } from '@chakra-ui/next-js'
import { Link as ChakraLink } from '@chakra-ui/react'
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Spacer,
  Spinner,
  Switch,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import * as PushAPI from '@pushprotocol/restapi'
import { SubscribeOptionsType } from '@pushprotocol/restapi/src/lib/channels'
import { ethers } from 'ethers'
import { useContext, useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useWalletClient, WalletClient } from 'wagmi'

import { SupportedChain } from '@/types/chains'
import { isProduction } from '@/utils/constants'
import { getCAIPAddress, PUSH_CHANNEL } from '@/utils/push_protocol_helper'
import { validateChainToActOn } from '@/utils/rpc_helper_front'

import { AccountContext } from '../../providers/AccountProvider'
import {
  AccountNotifications,
  DiscordNotificationType,
  NotificationChannel,
} from '../../types/AccountNotifications'
import { logEvent } from '../../utils/analytics'
import {
  getNotificationSubscriptions,
  setNotificationSubscriptions,
} from '../../utils/api_helper'
import { isProAccount } from '../../utils/subscription_manager'
import { isValidEmail } from '../../utils/validations'
import DiscordNotificationConfig from './DiscordNotificationConfig'

const NotificationsConfig: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const { data: walletClient } = useWalletClient()

  const [loading, setLoading] = useState(false)
  const [loadingInitialInfo, setLoadingInitialInfo] = useState(true)
  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [epnsNotifications, setEPNSNotifications] = useState(false)
  const [pushOptedIn, setPushOptedIn] = useState<{ opted: boolean } | null>(
    null
  )
  const [discordNotificationConfig, setDiscordNotificationConfig] = useState(
    undefined as DiscordNotificationType | undefined
  )

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    const subs = await getNotificationSubscriptions()
    checkPushSubscription()
    for (let i = 0; i < subs.notification_types.length; i++) {
      switch (subs.notification_types[i].channel) {
        case NotificationChannel.EMAIL:
          setEmail(subs.notification_types[i].destination)
          setEmailNotifications(true)
          break
        case NotificationChannel.EPNS:
          setEPNSNotifications(true)
          break
        case NotificationChannel.DISCORD:
          setDiscordNotificationConfig(
            subs.notification_types[i] as DiscordNotificationType
          )
          break
        default:
      }
    }
    setLoadingInitialInfo(false)
  }

  const toast = useToast()

  const onPushChange = (selected: boolean, signer?: any) => {
    setEPNSNotifications(selected)
    if (selected && signer) {
      subscribeToPushChannel(signer)
    }
  }

  const checkPushSubscription = async () => {
    const subscriptions = await PushAPI.user.getSubscriptions({
      user: getCAIPAddress(currentAccount!.address.toLowerCase()),
      env: process.env.NEXT_PUBLIC_ENV === 'production' ? 'prod' : 'staging',
    })
    const subscribed = subscriptions.some(
      (s: any) => s.channel.toLowerCase() === PUSH_CHANNEL.toLowerCase()
    )
    if (subscribed) {
      setPushOptedIn({ opted: true })
    } else {
      setPushOptedIn({ opted: false })
    }
  }
  const subscribeToPushChannel = async (
    signer: SubscribeOptionsType['signer']
  ) => {
    if (pushOptedIn?.opted === true) {
      return
    }
    try {
      await validateChainToActOn(
        process.env.NEXT_PUBLIC_ENV === 'production'
          ? SupportedChain.ETHEREUM
          : SupportedChain.GOERLI,
        walletClient
      )
    } catch (e) {
      toast({
        title: 'Error',
        description:
          "Please change your wallet's network to Ethereum to subscribe to Push protocol notifications.",
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
      return
    }

    await PushAPI.channels.subscribe({
      signer,
      channelAddress: getCAIPAddress(PUSH_CHANNEL), // channel address in CAIP
      userAddress: getCAIPAddress(currentAccount!.address.toLowerCase()), // user address in CAIP
      onSuccess: () => {
        setEPNSNotifications(true)
        setPushOptedIn({ opted: true })
      },
      onError: () => {
        setPushOptedIn({ opted: false })
      },
      env: isProduction ? 'prod' : 'staging',
    })
  }

  const onDiscordNotificationChange = (
    discordNotification?: DiscordNotificationType
  ) => {
    setDiscordNotificationConfig(discordNotification)
  }

  const updateNotifications = async () => {
    setLoading(true)

    const subs = {
      account_address: currentAccount!.address,
      notification_types: [],
    } as AccountNotifications
    if (emailNotifications) {
      if (!isValidEmail(email)) {
        toast({
          title: 'Invalid email',
          description: 'The provided email seems invalid. Please check.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
        setLoading(false)

        return
      }
      subs.notification_types.push({
        channel: NotificationChannel.EMAIL,
        destination: email,
        disabled: false,
      })
    }
    if (epnsNotifications) {
      subs.notification_types.push({
        channel: NotificationChannel.EPNS,
        destination: currentAccount!.address,
        disabled: false,
      })
    }
    if (discordNotificationConfig) {
      subs.notification_types.push(discordNotificationConfig)
    }

    await setNotificationSubscriptions(subs)

    logEvent('Set notifications', {
      channels: subs.notification_types.map(sub => sub.channel),
    })

    setLoading(false)
  }

  const isPro = isProAccount(currentAccount!)

  const walletClientToSigner = (walletClient: WalletClient) => {
    const { account, chain, transport } = walletClient
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    }
    const provider = new ethers.providers.Web3Provider(transport, network)
    const signer = provider.getSigner(account.address)
    return signer
  }

  /** Hook to convert a viem Wallet Client to an ethers.js Signer. */
  const useEthersSigner = ({ chainId }: { chainId?: number } = {}) => {
    const { data: walletClient } = useWalletClient({ chainId })
    return useMemo(
      () => (walletClient ? walletClientToSigner(walletClient) : undefined),
      [walletClient]
    )
  }

  const signer = useEthersSigner()

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <Heading fontSize="2xl">Notification Settings</Heading>

      {loadingInitialInfo ? (
        <HStack>
          <Spinner size={'sm'} />
          <Text ml={4}>Loading your notification settings</Text>
        </HStack>
      ) : (
        <>
          <HStack py={4} alignItems="center">
            <Switch
              colorScheme="primary"
              size="md"
              isChecked={emailNotifications}
              onChange={e => setEmailNotifications(e.target.checked)}
            />
            <Text>Email notifications</Text>
          </HStack>
          <FormControl>
            <FormLabel htmlFor="email">Email address</FormLabel>
            <Input
              isDisabled={!emailNotifications}
              id="email"
              type="email"
              value={emailNotifications ? email : ''}
              onChange={e => setEmail(e.target.value)}
            />
            <FormHelperText>
              We will only use your email to notify you about meetings.
            </FormHelperText>
          </FormControl>

          <Spacer />

          <DiscordNotificationConfig
            account={currentAccount!}
            onDiscordNotificationChange={onDiscordNotificationChange}
            discordNotification={discordNotificationConfig}
          />

          <Spacer />

          <HStack py={2}>
            <Switch
              colorScheme="primary"
              size="md"
              isChecked={pushOptedIn?.opted && epnsNotifications}
              onChange={e => onPushChange(e.target.checked, signer)}
              isDisabled={!isPro || !pushOptedIn}
            />
            <Text>
              Push notifications by{' '}
              <ChakraLink href="https://push.org" isExternal>
                Push protocol
              </ChakraLink>
              {!isPro && (
                <>
                  {' '}
                  (<Link href="/dashboard/details#subscriptions">
                    Go Pro
                  </Link>{' '}
                  to enable it)
                </>
              )}
            </Text>
          </HStack>
          {epnsNotifications && pushOptedIn && !pushOptedIn.opted && (
            <Text fontSize="sm">
              You need to subscribe to the meet with wallet channel on Push
              protocol.
            </Text>
          )}

          <Spacer />
          <Spacer />
          <Button
            isLoading={loading}
            alignSelf="start"
            colorScheme="primary"
            onClick={updateNotifications}
          >
            Save preferences
          </Button>
        </>
      )}
    </VStack>
  )
}

export default NotificationsConfig
