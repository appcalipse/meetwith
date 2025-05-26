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
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useEffect } from 'react'

import { Account } from '@/types/Account'
import { TelegramConnection } from '@/types/Telegram'

import {
  DiscordNotificationType,
  NotificationChannel,
} from '../../types/AccountNotifications'
import { logEvent } from '../../utils/analytics'
import {
  createTelegramHash,
  getNotificationSubscriptions,
  getPendingTgConnection,
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
  const [telegramNotificationConfigured, setTelegramNotificationConfigured] =
    useState(false)
  const [discordNotificationConfig, setDiscordNotificationConfig] = useState(
    undefined as DiscordNotificationType | undefined
  )
  const [connecting, setConnecting] = useState(false)
  const [tgConnectionPending, setTgConnectionPending] = useState<
    TelegramConnection | undefined
  >(undefined)

  const bgColor = useColorModeValue('gray.800', 'white')
  const color = useColorModeValue('white', 'gray.800')
  const { push } = useRouter()
  useEffect(() => {
    setLoadingInitialInfo(true)
    setEmailNotifications(false)
    setEmail('')
    fetchSubscriptions()
    // fetchPendingTgConnections()
    setDiscordNotificationConfig(undefined)
  }, [currentAccount])
  const fetchPendingTgConnections = async () => {
    const pendingConnection = await getPendingTgConnection()
    if (pendingConnection) {
      setTgConnectionPending(pendingConnection)
    }
  }
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
        case NotificationChannel.TELEGRAM:
          setTelegramNotificationConfigured(true)
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
    const subs = await getNotificationSubscriptions()
    subs.notification_types = subs.notification_types.filter(
      sub =>
        ![NotificationChannel.DISCORD, NotificationChannel.EMAIL].includes(
          sub.channel
        )
    )
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
  const handleTgConnect = async () => {
    setConnecting(true)
    logEvent('Connect Telegram')
    const hash = await createTelegramHash()
    const url = `https://t.me/MeetWithDEVBot?start=${hash.tg_id}`
    window.open(url, '_blank')

    const intervalId = setInterval(async () => {
      const pendingConnection = await getPendingTgConnection()
      if (!pendingConnection) {
        setTelegramNotificationConfigured(true)
        clearInterval(intervalId)
        setConnecting(false)
      }
    }, 5000)
  }
  const handleTgDisconnect = async () => {
    setConnecting(true)
    logEvent('Disconnect Telegram')
    const sub = await getNotificationSubscriptions()
    const newSubs = sub.notification_types.filter(
      sub => sub.channel !== NotificationChannel.TELEGRAM
    )
    await setNotificationSubscriptions({
      account_address: currentAccount!.address,
      notification_types: newSubs,
    })
    setTelegramNotificationConfigured(false)
    setConnecting(false)
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

          <HStack>
            <Switch
              colorScheme="primary"
              size="md"
              isChecked={telegramNotificationConfigured}
              onChange={e => {
                if (e.target.checked) {
                  handleTgConnect()
                } else {
                  handleTgDisconnect()
                }
              }}
              isDisabled={connecting}
            />
            <Text fontSize="lg" fontWeight="bold">
              Telegram
            </Text>
            {connecting && <Spinner size="sm" ml={2} />}
            {tgConnectionPending && (
              <Text fontSize="sm" color="gray.500">
                (Pending connection)
              </Text>
            )}
          </HStack>

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
