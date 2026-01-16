import {
  Button,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  PinInput,
  PinInputField,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'

import { sendVerificationCode } from '@/utils/api_helper'
import { VERIFICATION_CODE_COUNTDOWN_SECONDS } from '@/utils/constants'
import { formatCountdown } from '@/utils/generic_utils'
import { useToastHelpers } from '@/utils/toasts'

interface TransactionVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerificationComplete: (pin: string, verificationCode: string) => void
  isLoading?: boolean
  userEmail: string
}

const TransactionVerificationModal: React.FC<
  TransactionVerificationModalProps
> = ({
  isOpen,
  onClose,
  onVerificationComplete,
  isLoading = false,
  userEmail,
}) => {
  const [pinInput, setPinInput] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showVerificationCode, setShowVerificationCode] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const { showSuccessToast, showErrorToast } = useToastHelpers()

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Clear inputs when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearInputs()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && !codeSent) {
      handleSendVerificationCode()
    }
  }, [isOpen])

  const clearInputs = () => {
    setPinInput('')
    setVerificationCode('')
    setShowPin(false)
    setShowVerificationCode(false)
    setCodeSent(false)
    setCountdown(0)
  }

  const handleSendVerificationCode = async () => {
    setIsSendingCode(true)
    try {
      const response = await sendVerificationCode(userEmail)
      if (response.success) {
        showSuccessToast(
          'Verification Code Sent',
          'A 5-digit verification code has been sent to your email'
        )
        setCodeSent(true)
        setCountdown(VERIFICATION_CODE_COUNTDOWN_SECONDS)
      } else {
        showErrorToast(
          'Failed to Send Code',
          'Could not send verification code. Please try again.'
        )
      }
    } catch (_error) {
      showErrorToast(
        'Failed to Send Code',
        'Could not send verification code. Please try again.'
      )
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerify = () => {
    if (pinInput.length !== 5) {
      showErrorToast('Invalid PIN', 'Please enter a 5-digit PIN')
      return
    }
    if (verificationCode.length !== 5) {
      showErrorToast(
        'Invalid Code',
        'Please enter the 5-digit verification code'
      )
      return
    }

    onVerificationComplete(pinInput, verificationCode)
  }

  const handleCancel = () => {
    clearInputs()
    onClose()
  }

  const canVerify =
    pinInput.length === 5 && verificationCode.length === 5 && !isLoading

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md" isCentered>
      <ModalOverlay bg="#131A20CC" backdropFilter="blur(12px)" />
      <ModalContent
        bg="bg-surface"
        borderRadius={{ base: '0', md: '12px' }}
        border="1px solid"
        borderColor="border-wallet-subtle"
        p={8}
        maxW="592px"
        width="592px"
        shadow="none"
      >
        <ModalBody p={0}>
          <VStack spacing={6} align="stretch">
            {/* Header with back button */}
            <HStack spacing={3} mb={2}>
              <Button
                variant="ghost"
                p={0}
                minW="auto"
                onClick={handleCancel}
                _hover={{ bg: 'transparent' }}
              >
                <FiArrowLeft color="#F46739" size={20} />
              </Button>
              <Text fontSize="sm" color="primary.400" fontWeight="medium">
                Back
              </Text>
            </HStack>

            {/* Title and description */}
            <VStack align="flex-start" spacing={2}>
              <Text fontSize="2xl" fontWeight="bold" color="text-primary">
                Transaction verification
              </Text>
              <Text fontSize="sm" color="text-secondary">
                Enter your transaction PIN and verification code to complete
                this transaction. A verification code will be sent to your email
                automatically.
              </Text>
            </VStack>

            {/* Transaction PIN Input */}
            <VStack align="flex-start" spacing={3}>
              <Text fontSize="sm" fontWeight="medium" color="text-primary">
                Enter your transaction pin
              </Text>
              <HStack spacing={3}>
                <PinInput
                  value={pinInput}
                  onChange={setPinInput}
                  size="lg"
                  type="number"
                  mask={!showPin}
                >
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                </PinInput>
                <IconButton
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  icon={showPin ? <FiEyeOff /> : <FiEye />}
                  onClick={() => setShowPin(!showPin)}
                  variant="ghost"
                  size="sm"
                  color="text-muted"
                  _hover={{ bg: 'transparent', color: 'text-primary' }}
                />
              </HStack>
            </VStack>

            {/* Verification Code Input */}
            <VStack align="flex-start" spacing={3}>
              <Text fontSize="sm" fontWeight="medium" color="text-primary">
                Enter the verification code sent to your email (
                {userEmail.replace(/(.{2}).*(@.*)/, '$1***$2')})
              </Text>
              <HStack spacing={3}>
                <PinInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  size="lg"
                  type="number"
                  mask={!showVerificationCode}
                  isDisabled={isSendingCode && !codeSent}
                >
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                  <PinInputField
                    borderColor="border-subtle"
                    _hover={{ borderColor: 'border-default' }}
                  />
                </PinInput>
                <IconButton
                  aria-label={showVerificationCode ? 'Hide Code' : 'Show Code'}
                  icon={showVerificationCode ? <FiEyeOff /> : <FiEye />}
                  onClick={() => setShowVerificationCode(!showVerificationCode)}
                  variant="ghost"
                  size="sm"
                  color="text-muted"
                  _hover={{ bg: 'transparent', color: 'text-primary' }}
                />
              </HStack>

              {/* Status message and Request Code Button */}
              <VStack align="flex-start" spacing={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  color="primary.400"
                  onClick={handleSendVerificationCode}
                  isLoading={isSendingCode}
                  isDisabled={countdown > 0}
                  _hover={{ bg: 'transparent', color: 'primary.300' }}
                  p={0}
                  minH="auto"
                  h="auto"
                >
                  {countdown > 0
                    ? `Request new code (${formatCountdown(countdown)})`
                    : 'Request new code'}
                </Button>
              </VStack>
            </VStack>

            {/* Action buttons */}
            <HStack spacing={4} pt={4} justifyContent="space-between" pb={10}>
              <Button
                bg="primary.300"
                color="neutral.900"
                _hover={{ bg: 'primary.400' }}
                onClick={handleVerify}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
                isLoading={isLoading}
                loadingText="Verifying..."
                isDisabled={!canVerify}
              >
                Complete transaction
              </Button>
              <Button
                variant="outline"
                border="1px solid"
                bg="bg-surface-tertiary"
                borderColor="primary.300"
                color="primary.300"
                onClick={handleCancel}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default TransactionVerificationModal
