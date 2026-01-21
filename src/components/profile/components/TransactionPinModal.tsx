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

  const getModalTitle = (
    modalMode: 'create' | 'change' | 'disable'
  ): string => {
    switch (modalMode) {
      case 'create':
        return 'Set transaction pin'
      case 'change':
        return 'Change transaction pin'
      case 'disable':
        return 'Disable transaction pin'
      default:
        return 'Transaction pin'
    }
  }

  const getModalDescription = (
    modalMode: 'create' | 'change' | 'disable'
  ): string => {
    switch (modalMode) {
      case 'create':
        return 'Create new transaction pin for your transactions'
      case 'change':
        return 'Change your current transaction pin for your transactions'
      case 'disable':
        return 'Enter your current PIN to disable transaction pin protection'
      default:
        return 'Manage your transaction pin'
    }
  }

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
        bg="bg-surface"
        borderRadius={{ base: '0', md: '12px' }}
        border="1px solid"
        borderColor="border-wallet-subtle"
        p={8}
        maxW="592px"
        width={{ base: '100%', md: '592px' }}
        height={{ base: '100%', md: 'auto' }}
        boxShadow="none"
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
                <FaArrowLeft color="#F46739" size={20} />
              </Button>
              <Text fontSize="sm" color="primary.400" fontWeight="medium">
                Back
              </Text>
            </HStack>

            {/* Title and description */}
            <VStack align="flex-start" spacing={2}>
              <Text fontSize="2xl" fontWeight="bold" color="text-primary">
                {getModalTitle(mode)}
              </Text>
              <Text fontSize="sm" color="text-muted">
                {getModalDescription(mode)}
              </Text>
            </VStack>

            {/* Current PIN input - only for change and disable modes */}
            {(mode === 'change' || mode === 'disable') && (
              <VStack align="flex-start" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color="text-primary">
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
                    aria-label={showCurrentPin ? 'Hide PIN' : 'Show PIN'}
                    icon={showCurrentPin ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    variant="ghost"
                    size="sm"
                    color="text-muted"
                    _hover={{ bg: 'transparent', color: 'text-primary' }}
                  />
                </HStack>
              </VStack>
            )}

            {/* New PIN input - only for create and change modes */}
            {(mode === 'create' || mode === 'change') && (
              <VStack align="flex-start" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color="text-primary">
                  New Pin
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
                    aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
                    icon={showNewPin ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowNewPin(!showNewPin)}
                    variant="ghost"
                    size="sm"
                    color="text-muted"
                    _hover={{ bg: 'transparent', color: 'text-primary' }}
                  />
                </HStack>
              </VStack>
            )}

            {/* Confirm PIN input - only for create and change modes */}
            {(mode === 'create' || mode === 'change') && (
              <VStack align="flex-start" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color="text-primary">
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
                    aria-label={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
                    icon={showConfirmPin ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    variant="ghost"
                    size="sm"
                    color="text-muted"
                    _hover={{ bg: 'transparent', color: 'text-primary' }}
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
                color="neutral.900"
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

export default TransactionPinModal
