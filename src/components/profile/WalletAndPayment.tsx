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
import React, { useEffect, useState } from 'react'

import TransactionPinModal from '@/components/profile/components/TransactionPinModal'
import { Account } from '@/types/Account'
import {
  getChainId,
  getSupportedChainFromId,
  SupportedChain,
} from '@/types/chains'
import {
  getPaymentPreferences,
  savePaymentPreferences,
  verifyPin,
} from '@/utils/api_helper'
import {
  networkOptions as paymentNetworkOptions,
  supportedPaymentChains,
} from '@/utils/constants/meeting-types'
import { useToastHelpers } from '@/utils/toasts'

import Block from './components/Block'

const WalletAndPayment: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [modalMode, setModalMode] = useState<'create' | 'change' | 'disable'>(
    'create'
  )
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChain>(
    paymentNetworkOptions[0]?.value || supportedPaymentChains[0]
  )
  const [sendFundsNotification, setSendFundsNotification] = useState(true)
  const [receiveFundsNotification, setReceiveFundsNotification] =
    useState(false)

  // Fetch existing payment preferences
  const {
    data: paymentPreferences,
    refetch,
    isLoading: isPreferencesLoading,
  } = useQuery(
    ['paymentPreferences', currentAccount.address],
    () => getPaymentPreferences(),
    {
      enabled: !!currentAccount.address,
    }
  )

  // Initialize selected network from existing preferences or default
  useEffect(() => {
    if (paymentPreferences?.default_chain_id) {
      // Convert numeric chain ID back to SupportedChain enum
      const chainInfo = getSupportedChainFromId(
        paymentPreferences.default_chain_id
      )
      if (chainInfo) {
        setSelectedNetwork(chainInfo.chain)
      }
    }
  }, [paymentPreferences])

  // Initialize notification preferences from existing preferences
  useEffect(() => {
    if (
      paymentPreferences?.notification &&
      paymentPreferences.notification.length > 0
    ) {
      setSendFundsNotification(
        paymentPreferences.notification.includes('send-tokens')
      )
      setReceiveFundsNotification(
        paymentPreferences.notification.includes('receive-tokens')
      )
    }
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
      return await savePaymentPreferences(currentAccount.address, preferences)
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Payment preferences saved successfully')
        refetch()
      },
      onError: (error: unknown) => {
        showErrorToast('Error', 'Failed to save payment preferences')
        console.error('Error saving preferences:', error)
      },
    }
  )

  // Create PIN mutation
  const createPinMutation = useMutation(
    async (pin: string) => {
      const preferences = {
        pin_hash: pin, // Send plain PIN, server will hash it
        default_chain_id: getChainId(selectedNetwork),
        notification: (() => {
          const notifications: Array<'send-tokens' | 'receive-tokens'> = []
          if (sendFundsNotification) notifications.push('send-tokens')
          if (receiveFundsNotification) notifications.push('receive-tokens')
          return notifications
        })(),
      }
      return await savePaymentPreferences(currentAccount.address, preferences)
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN created successfully')
        // Close modal after successful operation - this will clear inputs
        handleModalClose()
        refetch()
      },
      onError: (error: unknown) => {
        // Show specific error message if available
        if (error instanceof Error) {
          showErrorToast('Error', error.message)
        } else {
          showErrorToast('Error', 'Failed to create transaction PIN')
        }
        console.error('Error creating PIN:', error)
        // Don't close modal on error - let user try again
      },
    }
  )

  // Change PIN mutation
  const changePinMutation = useMutation(
    async ({ oldPin, newPin }: { oldPin: string; newPin: string }) => {
      // First verify the old PIN
      const verification = await verifyPin(oldPin)

      if (!verification.valid) {
        throw new Error('The current pin you entered is incorrect')
      }

      // PIN verified, now update with new PIN
      // Use save function for partial updates
      return await savePaymentPreferences(currentAccount.address, {
        pin_hash: newPin, // Will be hashed on server
      })
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN updated successfully')
        // Close modal after successful operation - this will clear inputs
        handleModalClose()
        refetch()
      },
      onError: (error: unknown) => {
        // Show specific error message if available
        if (error instanceof Error) {
          showErrorToast('Error', error.message)
        } else {
          showErrorToast('Error', 'Failed to update transaction PIN')
        }
        console.error('Error updating PIN:', error)
        // Don't close modal on error - let user try again
      },
    }
  )

  // Disable PIN mutation
  const disablePinMutation = useMutation(
    async (pin: string) => {
      // First verify the PIN
      const verification = await verifyPin(pin)
      if (!verification.valid) {
        throw new Error('The current pin you entered is incorrect')
      }

      // PIN verified, now disable by setting pin_hash to null
      // Use save function for partial updates
      return await savePaymentPreferences(currentAccount.address, {
        pin_hash: null,
      })
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN disabled successfully')
        // Close modal after successful operation - this will clear inputs
        handleModalClose()
        refetch()
      },
      onError: (error: unknown) => {
        // Show specific error message if available
        if (error instanceof Error) {
          showErrorToast('Error', error.message)
        } else {
          showErrorToast('Error', 'Failed to disable transaction PIN')
        }
        console.error('Error disabling PIN:', error)
        // Don't close modal on error - let user try again
      },
    }
  )

  const handleEnablePin = () => {
    setModalMode('create')
    onOpen()
  }

  const handleChangePin = () => {
    setModalMode('change')
    onOpen()
  }

  const handleDisablePin = () => {
    setModalMode('disable')
    onOpen()
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

  const handleSavePreferences = () => {
    savePreferencesMutation.mutate()
  }

  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
      <Heading fontSize="2xl">Wallet & Payments</Heading>

      {/* Wallet Section */}
      <Block>
        {/* Wallet */}
        <Heading fontSize="xl" mb={4}>
          Wallet
        </Heading>

        <VStack align="stretch" spacing={4}>
          <Box mt={2}>
            <Text fontSize="md" fontWeight="medium" mb={3} color="neutral.0">
              Transaction Pin
            </Text>

            {isPreferencesLoading ? (
              // Show loading state while preferences are being fetched
              <HStack spacing={3}>
                <Button
                  isLoading
                  loadingText="Loading..."
                  bg="neutral.600"
                  color="neutral.300"
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
                  onClick={() => {}}
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
            Payment settings
          </Heading>

          <FormControl>
            <FormLabel fontSize="md" color="neutral.0">
              Network to receive payment
            </FormLabel>

            {/* Custom dropdown with chain icons, environment-aware options */}
            <Menu matchWidth>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                variant="outline"
                borderColor="neutral.825"
                bg="neutral.900"
                height="44px"
                width="390px"
                _hover={{ bg: 'neutral.900', borderColor: 'neutral.700' }}
                _active={{ bg: 'neutral.900' }}
                justifyContent="flex-start"
                px={4}
                isDisabled={isPreferencesLoading}
                opacity={isPreferencesLoading ? 0.6 : 1}
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
                  <Text fontWeight="600" color="white">
                    {isPreferencesLoading
                      ? 'Loading...'
                      : selected?.name || 'Select network'}
                  </Text>
                </HStack>
              </MenuButton>
              <MenuList bg="neutral.850" borderColor="neutral.800">
                {paymentNetworkOptions.map(option => (
                  <MenuItem
                    key={option.value}
                    onClick={() => setSelectedNetwork(option.value)}
                    bg="neutral.850"
                    _hover={{ bg: 'neutral.800' }}
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
                      <Text color="white">{option.name}</Text>
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

          <Text fontSize="md" fontWeight="500" mb={4} color="neutral.0">
            Notifications
          </Text>

          <VStack align="stretch" spacing={3}>
            <Checkbox
              isChecked={sendFundsNotification}
              onChange={e => setSendFundsNotification(e.target.checked)}
              size="lg"
              isDisabled={isPreferencesLoading}
              opacity={isPreferencesLoading ? 0.6 : 1}
              sx={{
                '.chakra-checkbox__control': {
                  bg: 'transparent',
                  borderColor: 'neutral.600',
                  _checked: {
                    bg: 'primary.200',
                    borderColor: 'primary.200',
                    color: 'neutral.900',
                  },
                },
                '.chakra-checkbox__label': {
                  color: 'neutral.0',
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
              isDisabled={isPreferencesLoading}
              opacity={isPreferencesLoading ? 0.6 : 1}
              sx={{
                '.chakra-checkbox__control': {
                  bg: 'transparent',
                  borderColor: 'neutral.600',
                  _checked: {
                    bg: 'primary.200',
                    borderColor: 'primary.200',
                    color: 'neutral.900',
                  },
                },
                '.chakra-checkbox__label': {
                  color: 'neutral.0',
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
              savePreferencesMutation.isLoading || isPreferencesLoading
            }
            isDisabled={isPreferencesLoading}
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
    </VStack>
  )
}

export default WalletAndPayment
