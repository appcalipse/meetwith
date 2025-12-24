import {
  Box,
  Button,
  HStack,
  Spinner,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Account } from '@/types/Account'
import {
  DiscordNotificationType,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { DiscordUserInfo } from '@/types/Discord'
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

  const isActive = !!discordNotification && !discordNotification.disabled

  return (
    <VStack alignItems="start" flex={1} spacing={2}>
      {!loading && (
        <HStack py={2} justifyContent="space-between" width="100%">
          <HStack spacing={3}>
            <Switch
              colorScheme="primary"
              size="lg"
              isChecked={isActive}
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
            <Text>Discord notifications</Text>
            <Box
              as="span"
              px={3}
              py={1.5}
              borderRadius="full"
              bg={isActive ? 'green.200' : 'primary.75'}
              color={isActive ? 'green.600' : 'primary.500'}
              fontSize="xs"
            >
              {isActive ? 'Active' : 'Inactive'}
            </Box>
          </HStack>
        </HStack>
      )}
      {loading ? (
        <HStack>
          <Spinner size={'sm'} />
          <Text ml={4}>Loading Discord information</Text>
        </HStack>
      ) : (
        <>
          {!loading && !discordConnected && (
            <Text>
              (Please first{' '}
              <Link href="/dashboard/settings/connected-accounts" passHref>
                <Text
                  as="span"
                  color="primary.200"
                  fontWeight="600"
                  textDecoration="underline"
                  cursor="pointer"
                >
                  connect your Discord account
                </Text>
              </Link>{' '}
              to enable it)
            </Text>
          )}
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
                target="_blank"
                rel="noopener noreferrer"
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
