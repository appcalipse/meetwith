import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Link,
  Spacer,
  Switch,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useContext, useState } from 'react'
import { useEffect } from 'react'

import { AccountContext } from '../../providers/AccountProvider'
import {
  AccountNotifications,
  NotificationChannel,
} from '../../types/AccountNotifications'
import { logEvent } from '../../utils/analytics'
import {
  getNotificationSubscriptions,
  setNotificationSubscriptions,
} from '../../utils/api_helper'
import { isValidEmail } from '../../utils/validations'

const NotificationsConfig: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)

  const [loading, setLoading] = useState(false)
  const [loadingInitialInfo, setLoadingInitialInfo] = useState(true)
  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [epnsNotifications, setEPNSNotifications] = useState(false)

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
        default:
      }
    }
    setLoadingInitialInfo(false)
  }

  const toast = useToast()

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
      })
    }
    if (epnsNotifications) {
      subs.notification_types.push({
        channel: NotificationChannel.EPNS,
        destination: currentAccount!.address,
      })
    }

    await setNotificationSubscriptions(subs)
    console.log(subs.notification_types.map(sub => sub.channel))
    logEvent(
      'Set notifications',
      subs.notification_types.map(sub => sub.channel)
    )

    setLoading(false)
  }

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <HStack py={4}>
        <Switch
          colorScheme="orange"
          size="md"
          mr={4}
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

      <HStack py={4}>
        <Switch
          colorScheme="orange"
          size="md"
          isChecked={epnsNotifications}
          onChange={e => setEPNSNotifications(e.target.checked)}
          isDisabled={true}
        />
        <Text>
          EPNS (
          <Link href="/dashboard/details" shallow>
            Go Pro
          </Link>{' '}
          to enable it)
        </Text>
      </HStack>
      <Text>
        Make sure you subscribe to{' '}
        <Link isExternal href="https://app.epns.io">
          Meet with Wallet channel
        </Link>{' '}
        on EPNS.
      </Text>

      <Spacer />

      <HStack py={4}>
        <Switch colorScheme="orange" size="md" isDisabled={true} />
        <Text>Browser Push notification (Coming soon)</Text>
      </HStack>

      <Spacer />
      <Button
        isLoading={loading}
        alignSelf="start"
        colorScheme="orange"
        onClick={updateNotifications}
      >
        Save preferences
      </Button>
    </VStack>
  )
}

export default NotificationsConfig
