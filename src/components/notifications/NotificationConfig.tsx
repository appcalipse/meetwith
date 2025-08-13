import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
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
  const [_loading, setLoading] = useState(false)
  const [loadingInitialInfo, setLoadingInitialInfo] = useState(true)

  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [telegramNotificationConfigured, setTelegramNotificationConfigured] =
    useState(false)
  const [discordNotificationConfig, setDiscordNotificationConfig] = useState(
    undefined as DiscordNotificationType | undefined
  )
  const [connecting, setConnecting] = useState(false)
  const [_tgConnectionPending, setTgConnectionPending] = useState<
    TelegramConnection | undefined
  >(undefined)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState('')
  const { push } = useRouter()
  const toast = useToast()

  useEffect(() => {
    setLoadingInitialInfo(true)
    setEmailNotifications(false)
    setEmail('')
    fetchSubscriptions()
    // fetchPendingTgConnections()
    setDiscordNotificationConfig(undefined)
  }, [currentAccount])

  // Refetch subscriptions when returning to notifications section

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
          setTempEmail(subs.notification_types[i].destination)
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

  const onDiscordNotificationChange = async (
    discordNotification?: DiscordNotificationType
  ) => {
    setDiscordNotificationConfig(discordNotification)
  }

  const updateNotifications = async () => {
    setLoading(true)
    const subs = await getNotificationSubscriptions()
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
      subs.notification_types = subs.notification_types.filter(
        sub => sub.channel !== NotificationChannel.EMAIL
      )
      subs.notification_types.push({
        channel: NotificationChannel.EMAIL,
        destination: email,
        disabled: false,
      })
    } else {
      subs.notification_types = subs.notification_types.filter(
        sub => sub.channel !== NotificationChannel.EMAIL
      )
    }

    if (discordNotificationConfig) {
      subs.notification_types = subs.notification_types.filter(
        sub => sub.channel !== NotificationChannel.DISCORD
      )
      subs.notification_types.push(discordNotificationConfig)
    } else {
      subs.notification_types = subs.notification_types.filter(
        sub => sub.channel !== NotificationChannel.DISCORD
      )
    }

    await setNotificationSubscriptions(subs)

    logEvent('Set notifications', {
      channels: subs.notification_types.map(sub => sub.channel),
    })

    setLoading(false)
    setIsEditingEmail(false)
    toast({
      title: 'Success',
      description: 'Notification preferences updated',
      status: 'success',
      duration: 3000,
      position: 'top',
    })
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

  const handleEmailChange = () => {
    setIsEditingEmail(true)
    setTempEmail(email)
  }

  const handleEmailSave = async () => {
    if (!isValidEmail(tempEmail)) {
      toast({
        title: 'Invalid email',
        description: 'The provided email seems invalid. Please check.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }
    setEmail(tempEmail)
    await updateNotifications()
  }

  return (
    <VStack
      alignItems="start"
      flex={1}
      mb={8}
      spacing={6}
      bg="neutral.900"
      p={8}
      borderRadius={16}
    >
      <Heading fontSize="2xl">Notifications</Heading>

      {loadingInitialInfo ? (
        <HStack>
          <Spinner size={'sm'} />
          <Text ml={4}>Loading your notification settings</Text>
        </HStack>
      ) : (
        <VStack width="100%" spacing={6} align="stretch">
          {/* Email Notifications */}
          <Box>
            <HStack justify="space-between" mb={3}>
              <HStack spacing={3}>
                <Switch
                  colorScheme="primary"
                  size="lg"
                  isChecked={emailNotifications}
                  onChange={e => setEmailNotifications(e.target.checked)}
                />
                <Text fontSize="md">Email notifications</Text>
                <Box
                  as="span"
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  bg={emailNotifications ? 'green.200' : 'primary.75'}
                  color={emailNotifications ? 'green.400' : 'primary.500'}
                  fontSize="xs"
                >
                  {emailNotifications ? 'Active' : 'Inactive'}
                </Box>
              </HStack>
            </HStack>

            {emailNotifications && (
              <VStack align="stretch" spacing={2}>
                <FormControl maxW="345px" mt={4}>
                  <FormLabel fontSize="md" color="neutral.0">
                    Email address
                  </FormLabel>
                  <Input
                    type="email"
                    value={isEditingEmail ? tempEmail : email}
                    onChange={e => setTempEmail(e.target.value)}
                    isReadOnly={!isEditingEmail}
                    bg="transparent"
                    borderColor="neutral.400"
                  />
                </FormControl>
                {isEditingEmail ? (
                  <HStack>
                    <Button size="sm" onClick={handleEmailSave}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingEmail(false)
                        setTempEmail(email)
                      }}
                    >
                      Cancel
                    </Button>
                  </HStack>
                ) : (
                  <Button
                    variant="link"
                    colorScheme="primary"
                    px={0}
                    onClick={handleEmailChange}
                    textDecoration="underline"
                    width="fit-content"
                  >
                    Change email
                  </Button>
                )}
              </VStack>
            )}
          </Box>

          {/* Discord Notifications */}
          <Box>
            <DiscordNotificationConfig
              account={currentAccount!}
              onDiscordNotificationChange={onDiscordNotificationChange}
              discordNotification={discordNotificationConfig}
            />
          </Box>

          {/* Telegram Notifications */}
          <Box>
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Switch
                  colorScheme="primary"
                  size="lg"
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
                <Text fontSize="md">Telegram notifications</Text>
                <Box
                  as="span"
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  bg={
                    telegramNotificationConfigured ? 'green.200' : 'primary.75'
                  }
                  color={
                    telegramNotificationConfigured ? 'green.400' : 'primary.500'
                  }
                  fontSize="xs"
                >
                  {telegramNotificationConfigured ? 'Active' : 'Inactive'}
                </Box>
                {connecting && <Spinner size="sm" ml={2} />}
              </HStack>
            </HStack>
          </Box>

          <Button
            isLoading={_loading}
            alignSelf="start"
            colorScheme="primary"
            onClick={updateNotifications}
          >
            Save preferences
          </Button>
        </VStack>
      )}
    </VStack>
  )
}

export default NotificationsConfig
