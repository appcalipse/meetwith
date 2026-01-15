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
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import ChangeEmailModal from '@/components/profile/components/ChangeEmailModal'
import MagicLinkModal from '@/components/profile/components/MagicLinkModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import { Account } from '@/types/Account'
import { TelegramConnection } from '@/types/Telegram'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

import {
  DiscordNotificationType,
  NotificationChannel,
  NotificationType,
} from '../../types/AccountNotifications'
import { logEvent } from '../../utils/analytics'
import {
  getNotificationSubscriptions,
  sendChangeEmailLink,
  setNotificationSubscriptions,
} from '../../utils/api_helper'
import { isValidEmail } from '../../utils/validations'
import DiscordNotificationConfig from './DiscordNotificationConfig'
import TelegramNotificationConfig from './TelegramNotificationConfig'

const NotificationsConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [_loading, setLoading] = useState(false)
  const [loadingInitialInfo, setLoadingInitialInfo] = useState(true)

  const [email, setEmail] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [telegramNotification, setTelegramNotification] = useState<
    NotificationType | undefined
  >(undefined)
  const [discordNotificationConfig, setDiscordNotificationConfig] = useState(
    undefined as DiscordNotificationType | undefined
  )
  const [_tgConnectionPending, _setTgConnectionPending] = useState<
    TelegramConnection | undefined
  >(undefined)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState('')
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false)
  const [isMagicLinkModalOpen, setIsMagicLinkModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  useEffect(() => {
    setLoadingInitialInfo(true)
    setEmailNotifications(false)
    setEmail('')
    fetchSubscriptions()
  }, [currentAccount])

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
          setTelegramNotification(subs.notification_types[i])
          break
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

  const onTelegramNotificationChange = async (enabled: boolean) => {
    if (!telegramNotification) return

    const updatedTelegramNotification = {
      ...telegramNotification,
      disabled: !enabled,
    }
    setTelegramNotification(updatedTelegramNotification)

    try {
      const subs = await getNotificationSubscriptions()

      subs.notification_types = subs.notification_types.map(sub => {
        if (sub.channel === NotificationChannel.TELEGRAM) {
          return updatedTelegramNotification
        }
        return sub
      })
      await setNotificationSubscriptions(subs)

      logEvent('Set Telegram notifications', { enabled })

      showSuccessToast(
        'Telegram Notifications Updated',
        `Telegram notifications have been ${enabled ? 'enabled' : 'disabled'}`
      )
    } catch (_error) {
      // Revert the state on error
      setTelegramNotification(telegramNotification)
      showErrorToast(
        'Update Failed',
        'Failed to update Telegram notification preferences'
      )
    }
  }

  const updateNotifications = async () => {
    setLoading(true)
    const subs = await getNotificationSubscriptions()

    // Handle Email notifications
    if (emailNotifications) {
      if (!isValidEmail(email)) {
        showErrorToast(
          'Invalid Email Format',
          'The provided email seems invalid. Please check.'
        )
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

    // Handle Discord notifications
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

    // Handle Telegram notifications
    if (telegramNotification) {
      subs.notification_types = subs.notification_types.filter(
        sub => sub.channel !== NotificationChannel.TELEGRAM
      )
      subs.notification_types.push(telegramNotification)
    }

    await setNotificationSubscriptions(subs)

    logEvent('Set notifications', {
      channels: subs.notification_types.map(sub => sub.channel),
    })

    setLoading(false)
    setIsEditingEmail(false)
    showSuccessToast(
      'Notification Preferences Updated',
      'Your notification preferences have been saved successfully'
    )
  }

  const handleChangeEmail = () => {
    if (!emailNotifications || !email) {
      setIsEditingEmail(true)
      setTempEmail('')
      return
    }
    setIsMagicLinkModalOpen(true)
  }

  const handleEmailSave = async () => {
    if (!isValidEmail(tempEmail)) {
      showErrorToast(
        'Invalid Email Format',
        'The provided email seems invalid. Please check.'
      )
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
      bg="bg-surface"
      p={{ base: 6, md: 8 }}
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
                  color={emailNotifications ? 'green.600' : 'primary.500'}
                  fontSize="xs"
                >
                  {emailNotifications ? 'Active' : 'Inactive'}
                </Box>
              </HStack>
            </HStack>

            {emailNotifications && (
              <VStack align="stretch" spacing={2}>
                <FormControl maxW="345px" mt={4}>
                  <FormLabel fontSize="md" color="text-primary">
                    Email address
                  </FormLabel>
                  <Input
                    type="email"
                    value={isEditingEmail ? tempEmail : email}
                    onChange={e => setTempEmail(e.target.value)}
                    isReadOnly={!isEditingEmail}
                    bg="transparent"
                    borderColor="border-subtle"
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
                    onClick={handleChangeEmail}
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
            <TelegramNotificationConfig
              account={currentAccount!}
              telegramNotification={telegramNotification}
              onTelegramNotificationChange={onTelegramNotificationChange}
            />
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

      {/* Change Email Modal */}
      <ChangeEmailModal
        isOpen={isChangeEmailModalOpen}
        onClose={() => setIsChangeEmailModalOpen(false)}
        onEmailChange={async () => {
          try {
            await sendChangeEmailLink(email)
            showSuccessToast(
              'Success',
              'A magic link has been sent to your email for this action. It will expire in 5 minutes.'
            )
            setIsChangeEmailModalOpen(false)
          } catch (error) {
            handleApiError('Magic Link Failed', error)
          }
        }}
        isLoading={false}
      />

      {/* Magic Link Confirmation Modal */}
      <MagicLinkModal
        isOpen={isMagicLinkModalOpen}
        onClose={() => setIsMagicLinkModalOpen(false)}
        onConfirm={async () => {
          setIsSendingMagicLink(true)
          try {
            // Send change email link to current email
            await sendChangeEmailLink(email)
            showSuccessToast(
              'Magic Link Sent',
              'A magic link has been sent to your email for this action. It will expire in 5 minutes.'
            )
            setIsMagicLinkModalOpen(false)
          } catch (error) {
            handleApiError('Magic Link Failed', error)
          } finally {
            setIsSendingMagicLink(false)
          }
        }}
        title="Change Account Email"
        message="A magic link will be sent to your current notification email to confirm the email change. This ensures the security of your account."
        confirmButtonText="Send Magic Link"
        isLoading={isSendingMagicLink}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Email update was successful"
        message="You have successfully updated your account & notification email"
        buttonText="Go back to Dashboard"
        onButtonClick={() => {
          setIsSuccessModalOpen(false)
        }}
      />
    </VStack>
  )
}

export default NotificationsConfig
