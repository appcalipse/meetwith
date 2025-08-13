import {
  Box,
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
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa'

interface TransactionPinModalProps {
  isOpen: boolean
  onClose: () => void
  onPinCreated: (pin: string) => void
  onPinChanged?: (oldPin: string, newPin: string) => void
  onPinDisabled?: (pin: string) => void
  isLoading?: boolean
  mode: 'create' | 'change' | 'disable'
}

const TransactionPinModal: React.FC<TransactionPinModalProps> = ({
  isOpen,
  onClose,
  onPinCreated,
  onPinChanged,
  onPinDisabled,
  isLoading = false,
  mode,
}) => {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [showCurrentPin, setShowCurrentPin] = useState(false)
  const [showNewPin, setShowNewPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)

  const textColor = useColorModeValue('gray.900', 'white')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const primaryColor = '#F46739'

  // Clear inputs whenever modal closes or mode changes (for security)
  useEffect(() => {
    if (!isOpen) {
      clearPinInputs()
    }
  }, [isOpen])

  // Clear inputs when mode changes (for security)
  useEffect(() => {
    clearPinInputs()
  }, [mode])

  const handleCreatePin = () => {
    if (newPin.length !== 5) {
      setError('Please enter a 5-digit PIN')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    setError('')
    onPinCreated(newPin)
    // Don't clear inputs here - wait for successful completion
  }

  const handleChangePin = () => {
    if (currentPin.length !== 5) {
      setError('Please enter your current 5-digit PIN')
      return
    }
    if (newPin.length !== 5) {
      setError('Please enter a 5-digit PIN')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    if (currentPin === newPin) {
      setError('New PIN must be different from current PIN')
      return
    }
    setError('')
    onPinChanged?.(currentPin, newPin)
    // Don't clear inputs here - wait for successful completion
  }

  const handleDisablePin = () => {
    if (currentPin.length !== 5) {
      setError('Please enter your current 5-digit PIN')
      return
    }
    if (currentPin === '00000') {
      setError('Please enter a valid PIN')
      return
    }
    setError('')
    onPinDisabled?.(currentPin)
    // Don't clear inputs here - wait for successful completion
  }

  const handleAction = () => {
    switch (mode) {
      case 'create':
        handleCreatePin()
        break
      case 'change':
        handleChangePin()
        break
      case 'disable':
        handleDisablePin()
        break
    }
  }

  const clearPinInputs = () => {
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setError('')
    setShowCurrentPin(false)
    setShowNewPin(false)
    setShowConfirmPin(false)
  }

  const handleCancel = () => {
    clearPinInputs()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md" isCentered>
      <ModalOverlay bg="#131A20CC" backdropFilter="blur(12px)" />
      <ModalContent
        bg="dark.700"
        borderRadius="12px"
        p={8}
        maxW="592px"
        width="592px"
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
                <FaArrowLeft color={primaryColor} size={20} />
              </Button>
              <Text fontSize="sm" color="primary.400" fontWeight="medium">
                Back
              </Text>
            </HStack>

            {/* Title and description */}
            <VStack align="flex-start" spacing={2}>
              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                {mode === 'create' && 'Set transaction pin'}
                {mode === 'change' && 'Change transaction pin'}
                {mode === 'disable' && 'Disable transaction pin'}
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                {mode === 'create' &&
                  'Create new transaction pin for your transactions'}
                {mode === 'change' &&
                  'Change your current transaction pin for your transactions'}
                {mode === 'disable' &&
                  'Enter your current PIN to disable transaction pin protection'}
              </Text>
            </VStack>

            {/* Current PIN input - only for change and disable modes */}
            {(mode === 'change' || mode === 'disable') && (
              <VStack align="flex-start" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  Current Pin
                </Text>
                <HStack spacing={3}>
                  <PinInput
                    value={currentPin}
                    onChange={setCurrentPin}
                    size="lg"
                    type="number"
                    mask={!showCurrentPin}
                  >
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </PinInput>
                  <IconButton
                    aria-label={showCurrentPin ? 'Hide PIN' : 'Show PIN'}
                    icon={showCurrentPin ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    variant="ghost"
                    size="sm"
                    color="neutral.400"
                    _hover={{ bg: 'transparent', color: 'white' }}
                  />
                </HStack>
              </VStack>
            )}

            {/* New PIN input - only for create and change modes */}
            {(mode === 'create' || mode === 'change') && (
              <VStack align="flex-start" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  {mode === 'create' ? 'New Pin' : 'New Pin'}
                </Text>
                <HStack spacing={3}>
                  <PinInput
                    value={newPin}
                    onChange={setNewPin}
                    size="lg"
                    type="number"
                    mask={!showNewPin}
                  >
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </PinInput>
                  <IconButton
                    aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
                    icon={showNewPin ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowNewPin(!showNewPin)}
                    variant="ghost"
                    size="sm"
                    color="neutral.400"
                    _hover={{ bg: 'transparent', color: 'white' }}
                  />
                </HStack>
              </VStack>
            )}

            {/* Confirm PIN input - only for create and change modes */}
            {(mode === 'create' || mode === 'change') && (
              <VStack align="flex-start" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  Confirm Pin
                </Text>
                <HStack spacing={3}>
                  <PinInput
                    value={confirmPin}
                    onChange={setConfirmPin}
                    size="lg"
                    type="number"
                    mask={!showConfirmPin}
                  >
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                    <PinInputField
                      borderColor="neutral.400"
                      _hover={{ borderColor: 'gray.400' }}
                    />
                  </PinInput>
                  <IconButton
                    aria-label={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
                    icon={showConfirmPin ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    variant="ghost"
                    size="sm"
                    color="neutral.400"
                    _hover={{ bg: 'transparent', color: 'white' }}
                  />
                </HStack>
              </VStack>
            )}

            {/* Error message */}
            {error && (
              <Text fontSize="sm" color="red.500">
                {error}
              </Text>
            )}

            {/* Action buttons */}
            <HStack spacing={4} pt={4} justifyContent="space-between" pb={10}>
              <Button
                bg="primary.300"
                color="dark.800"
                _hover={{ bg: 'primary.400' }}
                onClick={handleAction}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
                isLoading={isLoading}
                loadingText={
                  mode === 'create'
                    ? 'Creating PIN...'
                    : mode === 'change'
                    ? 'Updating PIN...'
                    : 'Disabling PIN...'
                }
                isDisabled={isLoading}
              >
                {mode === 'create' && 'Create Pin'}
                {mode === 'change' && 'Update Pin'}
                {mode === 'disable' && 'Disable Pin'}
              </Button>
              <Button
                variant="outline"
                border="1px solid"
                bg="neutral.825"
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

export default TransactionPinModal
