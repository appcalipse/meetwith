import { Box, HStack, Switch, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

import { Account } from '@/types/Account'
import { NotificationType } from '@/types/AccountNotifications'
import { SettingsSection } from '@/types/Dashboard'

interface Props {
  account: Account
  telegramNotification?: NotificationType
  onTelegramNotificationChange: (enabled: boolean) => void
}

const TelegramNotificationConfig: React.FC<Props> = ({
  telegramNotification,
  onTelegramNotificationChange,
}) => {
  const telegramConnected = !!telegramNotification

  const isActive = telegramNotification && !telegramNotification.disabled

  return (
    <VStack alignItems="start" flex={1} spacing={2}>
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

      {!telegramConnected && (
        <Text>
          (Please first{' '}
          <Link
            href={`/dashboard/settings/${SettingsSection.CONNECTED_ACCOUNTS}`}
          >
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
    </VStack>
  )
}

export default TelegramNotificationConfig
