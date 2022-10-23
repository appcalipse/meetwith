import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Spacer,
  Spinner,
  Switch,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useContext, useState } from 'react'
import { useEffect } from 'react'

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
  const [discordNotificationConfig, setDiscordNotificationConfig] = useState(
    undefined as DiscordNotificationType | undefined
  )

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    const subs = await getNotificationSubscriptions()
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
              colorScheme="orange"
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

          <HStack py={4}>
            <Switch
              colorScheme="orange"
              size="md"
              isChecked={epnsNotifications}
              onChange={e => setEPNSNotifications(e.target.checked)}
              isDisabled={!isPro}
            />
            <Text>
              EPNS{' '}
              {!isPro && (
                <>
                  (
                  <NextLink href="/dashboard/details" shallow passHref>
                    <Link>Go Pro</Link>
                  </NextLink>{' '}
                  to enable it)
                </>
              )}
            </Text>
          </HStack>
          <Text>
            Make sure you subscribe to{' '}
            <Link
              isExternal
              href="https://app.push.org/#/channels?channel=0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b"
            >
              Meet with Wallet channel
            </Link>{' '}
            on Push protocol.
          </Text>

          <Spacer />
          <Spacer />
          <Button
            isLoading={loading}
            alignSelf="start"
            colorScheme="orange"
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
