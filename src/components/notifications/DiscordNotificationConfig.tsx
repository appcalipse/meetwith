import { Link } from '@chakra-ui/next-js'
import { Button, HStack, Spinner, Switch, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { Account } from '@/types/Account'
import {
  DiscordNotificationType,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { DiscordUserInfo } from '@/types/DiscordUserInfo'
import { getDiscordInfo } from '@/utils/api_helper'
import { MWW_DISCORD_SERVER } from '@/utils/constants'
import { isProAccount } from '@/utils/subscription_manager'

interface Props {
  account: Account
  discordNotification?: DiscordNotificationType
  onDiscordNotificationChange: (
    discordNotification?: DiscordNotificationType
  ) => void
}

const DiscordNotificationConfig: React.FC<Props> = ({
  account,
  discordNotification,
  onDiscordNotificationChange,
}) => {
  const [loading, setLoading] = useState(true)
  const [discordConnected, setDiscordConnected] = useState(false)
  const [inMWWServer, setInMWWServer] = useState(false)
  const [canEnable, setCanEnable] = useState(false)

  const validateDiscord = async () => {
    if (account.discord_account) {
      const discordInfo: DiscordUserInfo | null = await getDiscordInfo()

      if (discordInfo?.id) {
        setDiscordConnected(true)
        setCanEnable(true)
      }

      if (discordInfo?.isInMWWServer) {
        setInMWWServer(true)
      }

      if (
        (!discordNotification ||
          (discordNotification && discordNotification.disabled)) &&
        discordInfo?.isInMWWServer
      ) {
        setCanEnable(true)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    validateDiscord()
  }, [])

  return (
    <VStack alignItems="start" flex={1} mb={8}>
      <HStack py={4}>
        <Switch
          colorScheme="primary"
          size="md"
          isChecked={!!discordNotification && !discordNotification.disabled}
          onChange={e => {
            if (e.target.checked) {
              onDiscordNotificationChange({
                channel: NotificationChannel.DISCORD,
                destination: account.discord_account!.discord_id.toString(),
                disabled: false,
                inMWWServer: true,
              })
            } else {
              onDiscordNotificationChange(undefined)
            }
          }}
          isDisabled={!loading && !canEnable}
        />
        <Text>
          Discord{' '}
          {!discordConnected && (
            <>
              (Please first{' '}
              <Link href="/dashboard/details#connected">
                connect your Discord account
              </Link>{' '}
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
          {!loading && discordConnected && !inMWWServer && (
            <>
              <Text>
                Please join the Meetwith server to receive your Discord
                notifications
              </Text>
              <Button
                as="a"
                isLoading={loading}
                alignSelf="start"
                variant="outline"
                colorScheme="primary"
                href={MWW_DISCORD_SERVER}
              >
                Join the server and refresh page
              </Button>
            </>
          )}
        </>
      )}
    </VStack>
  )
}

export default DiscordNotificationConfig
