import { Box, HStack, Spinner, Switch, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Account } from '@/types/Account'
import { NotificationChannel } from '@/types/AccountNotifications'
import { getNotificationSubscriptions } from '@/utils/api_helper'

interface Props {
  account: Account
  telegramNotification?: boolean
  onTelegramNotificationChange: (enabled: boolean) => void
}

const TelegramNotificationConfig: React.FC<Props> = ({
  account,
  telegramNotification,
  onTelegramNotificationChange,
}) => {
  const [loading, setLoading] = useState(true)
  const [telegramConnected, setTelegramConnected] = useState(false)

  const validateTelegram = async () => {
    if (!account.address) {
      setLoading(false)
      return
    }

    try {
      const subs = await getNotificationSubscriptions()
      const hasTelegramNotification = subs.notification_types.some(
        sub => sub.channel === NotificationChannel.TELEGRAM
      )
      setTelegramConnected(hasTelegramNotification)
    } catch (error) {
      console.error('Error checking Telegram connection:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    validateTelegram()
  }, [account])

  const isActive = telegramNotification

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
                onTelegramNotificationChange(e.target.checked)
              }}
              isDisabled={!telegramConnected}
            />
            <Text>Telegram notifications</Text>
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
          <Text ml={4}>Loading Telegram information</Text>
        </HStack>
      ) : (
        <>
          {!loading && !telegramConnected && (
            <Text>
              (Please first{' '}
              <Link href="/dashboard/details#connected-accounts" passHref>
                <Text
                  as="span"
                  color="primary.200"
                  fontWeight="600"
                  textDecoration="underline"
                  cursor="pointer"
                >
                  connect your Telegram account
                </Text>
              </Link>{' '}
              to enable notifications)
            </Text>
          )}
        </>
      )}
    </VStack>
  )
}

export default TelegramNotificationConfig
