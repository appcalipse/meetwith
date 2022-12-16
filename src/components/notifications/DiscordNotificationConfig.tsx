import {
  Button,
  HStack,
  Link,
  Spinner,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import { Account } from '../../types/Account'
import { DiscordNotificationType } from '../../types/AccountNotifications'
import { generateDiscordNotification } from '../../utils/api_helper'
import { discordRedirectUrl, MWW_DISCORD_SERVER } from '../../utils/constants'
import { isProAccount } from '../../utils/subscription_manager'

interface Props {
  account?: Account | null
  discordNotification?: DiscordNotificationType
  onDiscordNotificationChange: (
    discordNotification?: DiscordNotificationType
  ) => void
}

const DicordNotificationConfig: React.FC<Props> = ({
  account,
  discordNotification,
  onDiscordNotificationChange,
}) => {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [helperText, setHelperText] = useState(
    discordNotification && !discordNotification.disabled
      ? 'You are in the Meet with Wallet Discord server and your Discord notifications are enabled'
      : ''
  )

  const notificationEnabled =
    discordNotification && !discordNotification.disabled

  const [notificationOn, setNotificationsOn] = useState(notificationEnabled)

  const validateDiscord = async () => {
    if (!discordNotification || discordNotification.disabled) {
      const { discordResult, code } = router.query

      const subscribeToDiscord = async (code: string) => {
        try {
          const notification = await generateDiscordNotification(code)
          setNotificationsOn(true)
          onDiscordNotificationChange(notification)
          if (!notification.disabled) {
            setHelperText(
              'You are in the Meet with Wallet Discord server and your Discord notifications are enabled'
            )
          }
        } catch (error) {}
        setLoading(false)
      }

      if (discordResult && code) {
        subscribeToDiscord(code as string)
      } else {
        setLoading(false)
      }
    } else if (discordNotification && !discordNotification.inMWWServer) {
      setHelperText(
        'Please join the Meet with Wallet server to receive your Discord notifications'
      )
      setLoading(false)
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    !notificationOn && onDiscordNotificationChange(undefined)
  }, [notificationOn])

  useEffect(() => {
    validateDiscord()
  }, [])

  const isPro = isProAccount(account!)

  const notInServer = !discordNotification || !discordNotification.inMWWServer

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <HStack py={4}>
        <Switch
          colorScheme="orange"
          size="md"
          isChecked={notificationOn}
          onChange={e => setNotificationsOn(e.target.checked)}
          isDisabled={!isPro}
        />
        <Text>
          Discord{' '}
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
      {loading ? (
        <HStack>
          <Spinner size={'sm'} />
          <Text ml={4}>Loading Discord information</Text>
        </HStack>
      ) : (
        <>
          {helperText && <Text>{helperText}</Text>}

          {notificationOn && (
            <>
              {!notificationEnabled && (
                <Button
                  as="a"
                  isLoading={loading}
                  alignSelf="start"
                  variant="outline"
                  colorScheme="orange"
                  href={`https://discord.com/api/oauth2/authorize?client_id=${
                    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
                  }&redirect_uri=${encodeURIComponent(
                    discordRedirectUrl
                  )}&response_type=code&scope=identify%20guilds`}
                >
                  Authorize MWW on Discord
                </Button>
              )}
              {discordNotification && notInServer && (
                <Button
                  as="a"
                  isLoading={loading}
                  alignSelf="start"
                  variant="outline"
                  colorScheme="orange"
                  href={MWW_DISCORD_SERVER}
                >
                  Join the server
                </Button>
              )}
            </>
          )}
        </>
      )}
      )
    </VStack>
  )
}

export default DicordNotificationConfig
