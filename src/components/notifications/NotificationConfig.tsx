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
import { useState } from 'react'
import { useEffect } from 'react'

import { Account } from '@/types/Account'

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
import { isValidEmail } from '../../utils/validations'
import DiscordNotificationConfig from './DiscordNotificationConfig'

const NotificationsConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [loading, setLoading] = useState(false)
  const [loadingInitialInfo, setLoadingInitialInfo] = useState(true)
  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [discordNotificationConfig, setDiscordNotificationConfig] = useState(
    undefined as DiscordNotificationType | undefined
  )

  useEffect(() => {
    setLoadingInitialInfo(true)
    setEmailNotifications(false)
    setEmail('')
    fetchSubscriptions()
    setDiscordNotificationConfig(undefined)
  }, [currentAccount])

  const fetchSubscriptions = async () => {
    const subs = await getNotificationSubscriptions()
    for (let i = 0; i < subs.notification_types.length; i++) {
      switch (subs.notification_types[i].channel) {
        case NotificationChannel.EMAIL:
          setEmail(subs.notification_types[i].destination)
          setEmailNotifications(true)
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

    if (discordNotificationConfig) {
      subs.notification_types.push(discordNotificationConfig)
    }

    await setNotificationSubscriptions(subs)

    logEvent('Set notifications', {
      channels: subs.notification_types.map(sub => sub.channel),
    })

    setLoading(false)
  }

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <Heading fontSize="2xl">Notifications</Heading>

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
