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
import { ethers } from 'ethers'
import { useContext, useState } from 'react'
import { useEffect } from 'react'

import { SupportedChain } from '@/types/chains'
import { getCAIPAddress, PUSH_CHANNEL } from '@/utils/push_protocol_helper'
import { validateChainToActOn } from '@/utils/rpc_helper_front'
import { connectedProvider } from '@/utils/user_manager'

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
import DicordNotificationConfig from './DiscordNotificationConfig'

const NotificationsConfig: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)

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

  const onPushChange = (selected: boolean) => {
    setEPNSNotifications(selected)
    if (selected) {
      subscribeToPushChannel()
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
  const subscribeToPushChannel = async () => {
    if (pushOptedIn?.opted === true) {
      return
    }
    const provider = new ethers.providers.Web3Provider(connectedProvider, 'any')
    try {
      await validateChainToActOn(
        process.env.NEXT_PUBLIC_ENV === 'production'
          ? SupportedChain.ETHEREUM
          : SupportedChain.GOERLI,
        provider
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
    const _signer = provider.getSigner()

    await PushAPI.channels.subscribe({
      signer: _signer as any,
      channelAddress: getCAIPAddress(PUSH_CHANNEL), // channel address in CAIP
      userAddress: getCAIPAddress(currentAccount!.address.toLowerCase()), // user address in CAIP
      onSuccess: () => {
        setEPNSNotifications(true)
        setPushOptedIn({ opted: true })
      },
      onError: () => {
        setPushOptedIn({ opted: false })
      },
      env: process.env.NEXT_PUBLIC_ENV === 'production' ? 'prod' : 'staging',
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
              disabled={!emailNotifications}
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

          <DicordNotificationConfig
            account={currentAccount}
            onDiscordNotificationChange={onDiscordNotificationChange}
            discordNotification={discordNotificationConfig}
          />

          <Spacer />

          <HStack py={2}>
            <Switch
              colorScheme="primary"
              size="md"
              isChecked={pushOptedIn?.opted && epnsNotifications}
              onChange={e => onPushChange(e.target.checked)}
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
                  (
                  <Link href="/dashboard/details" shallow>
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
