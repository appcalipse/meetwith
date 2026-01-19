import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import MagicLinkModal from '@/components/profile/components/MagicLinkModal'
import ProUpgradePrompt from '@/components/profile/components/ProUpgradePrompt'
import ResetPinModal from '@/components/profile/components/ResetPinModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import TransactionPinModal from '@/components/profile/components/TransactionPinModal'
import { Account } from '@/types/Account'
import {
  getChainId,
  getSupportedChainFromId,
  SupportedChain,
} from '@/types/chains'
import {
  createPaymentPreferences,
  getNotificationSubscriptions,
  getPaymentPreferences,
  sendEnablePinLink,
  sendResetPinLink,
  updatePaymentPreferences,
} from '@/utils/api_helper'
import {
  networkOptions as paymentNetworkOptions,
  supportedPaymentChains,
} from '@/utils/constants/meeting-types'
import { handleApiError } from '@/utils/error_helper'
import { getActiveProSubscription } from '@/utils/subscription_manager'
import { useToastHelpers } from '@/utils/toasts'

import Block from './components/Block'
import InfoTooltip from './components/Tooltip'

const WalletAndPayment: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isResetPinOpen,
    onOpen: _onResetPinOpen,
    onClose: onResetPinClose,
  } = useDisclosure()
  const {
    isOpen: isMagicLinkOpen,
    onOpen: onMagicLinkOpen,
    onClose: onMagicLinkClose,
  } = useDisclosure()
  const {
    isOpen: isSuccessOpen,
    onOpen: onSuccessOpen,
    onClose: onSuccessClose,
  } = useDisclosure()
  const [modalMode, setModalMode] = useState<'create' | 'change' | 'disable'>(
    'create'
  )
  const [pinAction, setPinAction] = useState<'enable' | 'reset'>('enable')
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChain>(
    paymentNetworkOptions[0]?.value || supportedPaymentChains[0]
  )
  const [sendFundsNotification, setSendFundsNotification] = useState(true)
  const [receiveFundsNotification, setReceiveFundsNotification] = useState(true)
  const [notificationEmail, setNotificationEmail] = useState<string | null>(
    null
  )
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)

  // Fetch existing payment preferences
  const {
    data: paymentPreferences,
    refetch,
    isLoading: isPreferencesLoading,
    isFetching: isPreferencesFetching,
  } = useQuery(
    ['paymentPreferences', currentAccount.address],
    () => getPaymentPreferences(),
    {
      enabled: !!currentAccount.address,
      refetchOnMount: true,
    }
  )

  // Fetch notification subscriptions to check for email
  const { data: notificationSubscriptions, isLoading: _isNotificationLoading } =
    useQuery(
      ['notificationSubscriptions', currentAccount.address],
      () => getNotificationSubscriptions(),
      {
        enabled: !!currentAccount.address,
      }
    )

  // Initialize selected network from existing preferences or default
  useEffect(() => {
    if (paymentPreferences?.default_chain_id) {
      const chainInfo = getSupportedChainFromId(
        paymentPreferences.default_chain_id
      )
      if (chainInfo) {
        setSelectedNetwork(chainInfo.chain)
      }
    }
  }, [paymentPreferences])

  useEffect(() => {
    if (!paymentPreferences) {
      setSendFundsNotification(true)
      setReceiveFundsNotification(true)
      return
    }

    const notifications = paymentPreferences.notification
    if (!notifications) {
      setSendFundsNotification(true)
      setReceiveFundsNotification(true)
      return
    }

    setSendFundsNotification(notifications.includes('send-tokens'))
    setReceiveFundsNotification(notifications.includes('receive-tokens'))
  }, [paymentPreferences])

  const selected = paymentNetworkOptions.find(n => n.value === selectedNetwork)

  // Save preferences mutation
  const savePreferencesMutation = useMutation(
    async () => {
      const preferences = {
        default_chain_id: getChainId(selectedNetwork),
        notification: (() => {
          const notifications: Array<'send-tokens' | 'receive-tokens'> = []
          if (sendFundsNotification) notifications.push('send-tokens')
          if (receiveFundsNotification) notifications.push('receive-tokens')
          return notifications
        })(),
      }
      if (paymentPreferences) {
        return await updatePaymentPreferences(
          currentAccount.address,
          preferences
        )
      } else {
        return await createPaymentPreferences(
          currentAccount.address,
          preferences
        )
      }
    },
    {
      onSuccess: () => {
        showSuccessToast(
          'Payment Preferences Saved',
          'Payment preferences saved successfully'
        )
        refetch()
      },
      onError: (error: unknown) => {
        showErrorToast('Save Failed', 'Failed to save payment preferences')
        console.error('Error saving preferences:', error)
      },
    }
  )

  // Create PIN mutation
  const createPinMutation = useMutation(
    async (pin: string) => {
      const preferences = {
        pin: pin, // Send plain PIN, server will hash it
        default_chain_id: getChainId(selectedNetwork),
        notification: (() => {
          const notifications: Array<'send-tokens' | 'receive-tokens'> = []
          if (sendFundsNotification) notifications.push('send-tokens')
          if (receiveFundsNotification) notifications.push('receive-tokens')
          return notifications
        })(),
      }
      return await createPaymentPreferences(currentAccount.address, preferences)
    },
    {
      onSuccess: () => {
        showSuccessToast(
          'Transaction PIN Created',
          'Transaction PIN created successfully'
        )
        handleModalClose()
        refetch()
      },
      onError: (error: unknown) => {
        handleApiError('PIN Creation Failed', error)
        console.error('Error creating PIN:', error)
      },
    }
  )

  // Change PIN mutation
  const changePinMutation = useMutation(
    async ({ oldPin, newPin }: { oldPin: string; newPin: string }) => {
      return await updatePaymentPreferences(
        currentAccount.address,
        {
          pin: newPin,
        },
        oldPin
      )
    },
    {
      onSuccess: () => {
        showSuccessToast(
          'Transaction PIN Updated',
          'Transaction PIN updated successfully'
        )
        handleModalClose()
        refetch()
      },
      onError: (error: unknown) => {
        handleApiError('PIN Update Failed', error)
      },
    }
  )

  // Disable PIN mutation
  const disablePinMutation = useMutation(
    async (pin: string) => {
      return await updatePaymentPreferences(
        currentAccount.address,
        {
          pin: null,
        },
        pin
      )
    },
    {
      onSuccess: () => {
        showSuccessToast(
          'Transaction PIN Disabled',
          'Transaction PIN disabled successfully'
        )
        handleModalClose()
        refetch()
      },
      onError: (error: unknown) => {
        handleApiError('PIN Disable Failed', error)
      },
    }
  )

  const handleEnablePin = () => {
    // Check if notificationSubscriptions exists and has data
    if (
      !notificationSubscriptions ||
      !notificationSubscriptions.notification_types
    ) {
      showErrorToast(
        'Notification Email Required',
        'You need to set up a notification email first to enable your PIN'
      )
      return
    }

    // Check if user has notification email set up
    const hasEmailNotification =
      notificationSubscriptions.notification_types.some(
        (sub: { channel: string; disabled: boolean }) =>
          sub.channel === 'email' && !sub.disabled
      )

    if (!hasEmailNotification) {
      showErrorToast(
        'Notification Email Required',
        'You need to set up a notification email first to enable your PIN'
      )
      return
    }

    // Get the email address
    const emailSub = notificationSubscriptions.notification_types.find(
      (sub: { channel: string; destination?: string }) =>
        sub.channel === 'email'
    )

    if (emailSub?.destination) {
      setModalMode('create') // Set mode to 'create' for enable PIN flow
      setPinAction('enable') // Set action to 'enable'
      setNotificationEmail(emailSub.destination)
      onMagicLinkOpen()
    } else {
      showErrorToast(
        'Notification Email Missing',
        'Could not find your notification email address'
      )
    }
  }

  const handleChangePin = () => {
    setModalMode('change')
    onOpen()
  }

  const handleDisablePin = () => {
    setModalMode('disable')
    onOpen()
  }

  const handleResetPin = () => {
    // Check if notificationSubscriptions exists and has data
    if (
      !notificationSubscriptions ||
      !notificationSubscriptions.notification_types
    ) {
      showErrorToast(
        'Notification Email Required',
        'You need to set up a notification email first to reset your PIN'
      )
      return
    }

    // Check if user has notification email set up
    const hasEmailNotification =
      notificationSubscriptions.notification_types.some(
        (sub: { channel: string; disabled: boolean }) =>
          sub.channel === 'email' && !sub.disabled
      )

    if (!hasEmailNotification) {
      showErrorToast(
        'Notification Email Required',
        'You need to set up a notification email first to reset your PIN'
      )
      return
    }

    // Get the email address
    const emailSub = notificationSubscriptions.notification_types.find(
      (sub: { channel: string; destination?: string }) =>
        sub.channel === 'email'
    )

    if (emailSub?.destination) {
      setPinAction('reset') // Set action to 'reset'
      setNotificationEmail(emailSub.destination)
      onMagicLinkOpen()
    } else {
      showErrorToast(
        'Notification Email Missing',
        'Could not find your notification email address'
      )
    }
  }

  const handleModalClose = () => {
    // Reset all mutation states when modal is closed
    createPinMutation.reset()
    changePinMutation.reset()
    disablePinMutation.reset()
    onClose()
  }

  const handlePinCreated = async (pin: string) => {
    createPinMutation.mutate(pin)
  }

  const handlePinChanged = async (oldPin: string, newPin: string) => {
    changePinMutation.mutate({ oldPin, newPin })
  }

  const handlePinDisabled = async (pin: string) => {
    disablePinMutation.mutate(pin)
  }

  // Reset PIN mutation
  const resetPinMutation = useMutation(
    async (newPin: string) => {
      return await updatePaymentPreferences(currentAccount.address, {
        pin: newPin, // Will be hashed on server
      })
    },
    {
      onSuccess: () => {
        showSuccessToast(
          'Transaction PIN Reset',
          'Transaction PIN reset successfully'
        )
        onResetPinClose()
        onSuccessOpen()
        refetch()
      },
      onError: (error: unknown) => {
        if (error instanceof Error) {
          showErrorToast('PIN Reset Failed', error.message)
        } else {
          showErrorToast('PIN Reset Failed', 'Failed to reset transaction PIN')
        }
        console.error('Error resetting PIN:', error)
      },
    }
  )

  const handlePinReset = async (newPin: string) => {
    resetPinMutation.mutate(newPin)
  }

  const handleSavePreferences = () => {
    savePreferencesMutation.mutate()
  }

  useEffect(() => {
    if (currentAccount.address) {
      refetch()
    }
  }, [router.asPath, currentAccount.address, refetch])

  const activeSubscription = getActiveProSubscription(currentAccount)
  const hasProAccess = Boolean(activeSubscription)

  if (!hasProAccess) {
    return (
      <ProUpgradePrompt
        heading="Wallet & Payments requires Pro"
        subheading="Upgrade to Pro to access wallet features including payments, invoicing, and fund management."
      />
    )
  }

  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
      <Heading fontSize="2xl">Wallet & Payments</Heading>

      {/* Wallet Section */}
      <Block p={{ base: 6, md: 8 }}>
        {/* Wallet */}
        <Heading fontSize="xl" mb={4}>
          Wallet
        </Heading>

        <VStack align="stretch" spacing={4}>
          <Box mt={2}>
            <Heading
              fontSize="base"
              fontWeight={700}
              mb={3}
              color="text-primary"
            >
              Enable Transaction Pin
            </Heading>
            <Text pb="4">
              Protect your funds by setting a transaction pin for sending and
              withdrawing from your wallet
            </Text>
            {isPreferencesLoading || isPreferencesFetching ? (
              <HStack spacing={3}>
                <Button
                  isLoading
                  loadingText="Loading..."
                  bg="bg-surface-tertiary-2"
                  color="text-secondary"
                  size="md"
                  px={6}
                  isDisabled
                >
                  Loading...
                </Button>
              </HStack>
            ) : paymentPreferences?.hasPin ? (
              // User has a PIN - show change/disable options
              <HStack spacing={3}>
                <Button
                  onClick={handleChangePin}
                  bg="primary.200"
                  color="dark.800"
                  _hover={{ bg: 'primary.300' }}
                  size="md"
                  px={6}
                >
                  Change Pin
                </Button>
                <Button
                  onClick={handleDisablePin}
                  variant="outline"
                  borderColor="primary.200"
                  color="primary.200"
                  _hover={{ bg: 'transparent' }}
                  size="md"
                  px={6}
                >
                  Disable Pin
                </Button>
                <Button
                  onClick={handleResetPin}
                  variant="outline"
                  borderColor="primary.200"
                  color="primary.200"
                  _hover={{ bg: 'transparent' }}
                  size="md"
                  px={6}
                >
                  Reset Pin
                </Button>
              </HStack>
            ) : (
              // User doesn't have a PIN - show enable option
              <Button
                onClick={handleEnablePin}
                bg="primary.200"
                color="dark.800"
                _hover={{ bg: 'primary.300' }}
                size="md"
                px={6}
              >
                Enable Pin
              </Button>
            )}
          </Box>
        </VStack>

        {/* Payment settings */}
        <Box mt={10}>
          <Heading fontSize="xl" mb={4}>
            Payment channels
          </Heading>

          <FormControl>
            <Heading
              fontSize="base"
              mb={4}
              textTransform="uppercase"
              color="neutral.200"
              fontWeight={500}
            >
              CRYPTO SETTINGS
            </Heading>
            <Box mb={4}>
              <FormLabel fontSize="md" color="text-primary">
                Network you prefer your payment to be settled in{' '}
                <InfoTooltip text="Clients can pay you in any EVM network and we settle you in your preferred network." />
              </FormLabel>
            </Box>
            {/* Custom dropdown with chain icons, environment-aware options */}
            <Menu matchWidth>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                variant="outline"
                borderColor="border-default"
                bg="bg-surface"
                height="44px"
                width={{ base: '100%', md: '390px' }}
                justifyContent="flex-start"
                px={4}
                isDisabled={isPreferencesLoading || isPreferencesFetching}
                opacity={
                  isPreferencesLoading || isPreferencesFetching ? 0.6 : 1
                }
              >
                <HStack spacing={3}>
                  <Box
                    w="20px"
                    h="20px"
                    borderRadius="full"
                    overflow="hidden"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {selected?.icon ? (
                      <Image
                        src={selected.icon}
                        alt={selected.name}
                        w="100%"
                        h="100%"
                      />
                    ) : null}
                  </Box>
                  <Text fontWeight="600" color="text-primary">
                    {isPreferencesLoading
                      ? 'Loading...'
                      : selected?.name || 'Select network'}
                  </Text>
                </HStack>
              </MenuButton>
              <MenuList
                bg="bg-surface-secondary"
                borderColor="border-default"
                boxShadow="none"
                shadow="none"
              >
                {paymentNetworkOptions.map(option => (
                  <MenuItem
                    key={option.value}
                    onClick={() => setSelectedNetwork(option.value)}
                    bg="bg-surface-secondary"
                    _hover={{ bg: 'bg-surface-tertiary' }}
                  >
                    <HStack spacing={3}>
                      <Box
                        w="20px"
                        h="20px"
                        borderRadius="full"
                        overflow="hidden"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Image
                          src={option.icon}
                          alt={option.name}
                          w="100%"
                          h="100%"
                        />
                      </Box>
                      <Text color="text-primary">{option.name}</Text>
                    </HStack>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </FormControl>
        </Box>

        {/* Payment & Wallet notifications */}
        <Box mt={10}>
          <Heading fontSize="xl" mb={2}>
            Payment & Wallet notifications
          </Heading>

          <Text
            fontSize="md"
            fontWeight="500"
            mb={4}
            mt={{ base: 4, md: 0 }}
            color="text-primary"
          >
            Notifications
          </Text>

          <VStack align="stretch" spacing={3}>
            <Checkbox
              isChecked={sendFundsNotification}
              onChange={e => setSendFundsNotification(e.target.checked)}
              size="lg"
              isDisabled={isPreferencesLoading || isPreferencesFetching}
              opacity={isPreferencesLoading || isPreferencesFetching ? 0.6 : 1}
              sx={{
                '.chakra-checkbox__control': {
                  bg: 'transparent',
                  borderColor: 'border-subtle',
                  _checked: {
                    bg: 'primary.200',
                    borderColor: 'primary.200',
                    color: 'neutral.900',
                  },
                },
                '.chakra-checkbox__label': {
                  color: 'text-primary',
                  fontSize: 'md',
                },
              }}
            >
              Send funds notification
            </Checkbox>

            <Checkbox
              isChecked={receiveFundsNotification}
              onChange={e => setReceiveFundsNotification(e.target.checked)}
              size="lg"
              isDisabled={isPreferencesLoading || isPreferencesFetching}
              opacity={isPreferencesLoading || isPreferencesFetching ? 0.6 : 1}
              sx={{
                '.chakra-checkbox__control': {
                  bg: 'transparent',
                  borderColor: 'border-subtle',
                  _checked: {
                    bg: 'primary.200',
                    borderColor: 'primary.200',
                    color: 'neutral.900',
                  },
                },
                '.chakra-checkbox__label': {
                  color: 'text-primary',
                  fontSize: 'md',
                },
              }}
            >
              Receive funds notification
            </Checkbox>
          </VStack>
        </Box>

        {/* Save Preferences Button */}
        <Box mt={8}>
          <Button
            onClick={handleSavePreferences}
            isLoading={
              savePreferencesMutation.isLoading ||
              isPreferencesLoading ||
              isPreferencesFetching
            }
            isDisabled={isPreferencesLoading || isPreferencesFetching}
            bg="primary.200"
            color="dark.800"
            _hover={{ bg: 'primary.300' }}
            size="md"
            px={6}
          >
            Save preferences
          </Button>
        </Box>
      </Block>

      {/* Transaction PIN Modal */}
      <TransactionPinModal
        isOpen={isOpen}
        onClose={handleModalClose}
        onPinCreated={handlePinCreated}
        onPinChanged={handlePinChanged}
        onPinDisabled={handlePinDisabled}
        isLoading={
          (modalMode === 'create' && createPinMutation.isLoading) ||
          (modalMode === 'change' && changePinMutation.isLoading) ||
          (modalMode === 'disable' && disablePinMutation.isLoading)
        }
        mode={modalMode}
      />

      {/* Reset PIN Modal */}
      <ResetPinModal
        isOpen={isResetPinOpen}
        onClose={onResetPinClose}
        onPinReset={handlePinReset}
        isLoading={resetPinMutation.isLoading}
      />

      {/* Magic Link Confirmation Modal */}
      <MagicLinkModal
        isOpen={isMagicLinkOpen}
        onClose={onMagicLinkClose}
        onConfirm={async () => {
          if (notificationEmail) {
            setIsSendingMagicLink(true)
            try {
              // Determine which action to perform based on the current context
              if (pinAction === 'enable') {
                // Enable PIN flow
                await sendEnablePinLink(notificationEmail)
                showSuccessToast(
                  'Enable PIN Link Sent',
                  'A magic link has been sent to your email to set up your transaction PIN. It will expire in 5 minutes.'
                )
              } else if (pinAction === 'reset') {
                // Reset PIN flow
                await sendResetPinLink(notificationEmail)
                showSuccessToast(
                  'Reset PIN Link Sent',
                  'A magic link has been sent to your email for this action. It will expire in 5 minutes.'
                )
              }
              onMagicLinkClose()
            } catch (error) {
              handleApiError('Magic Link Failed', error)
            } finally {
              setIsSendingMagicLink(false)
            }
          }
        }}
        title={
          pinAction === 'enable'
            ? 'Enable Transaction PIN'
            : 'Reset Transaction PIN'
        }
        message={
          pinAction === 'enable'
            ? 'A magic link will be sent to your notification email to set up your transaction PIN. This ensures the security of your account.'
            : 'A magic link will be sent to your notification email to reset your transaction PIN. This ensures the security of your account.'
        }
        confirmButtonText="Send Magic Link"
        isLoading={isSendingMagicLink}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={onSuccessClose}
        title={
          pinAction === 'enable'
            ? 'Transaction PIN enabled successfully'
            : 'Transaction pin reset was successful'
        }
        message={
          pinAction === 'enable'
            ? 'You have successfully set up your transaction PIN for secure transactions'
            : 'You have successfully reset your transaction PIN for secure transactions'
        }
        buttonText="Go back to Dashboard"
        onButtonClick={() => {
          onSuccessClose()
          // Navigate back to dashboard or close all modals
        }}
      />
    </VStack>
  )
}

export default WalletAndPayment
