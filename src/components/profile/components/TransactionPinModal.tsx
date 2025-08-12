import {
  Box,
  Button,
  HStack,
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
import React, { useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

interface TransactionPinModalProps {
  isOpen: boolean
  onClose: () => void
  onPinCreated: (pin: string) => void
}

const TransactionPinModal: React.FC<TransactionPinModalProps> = ({
  isOpen,
  onClose,
  onPinCreated,
}) => {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  const textColor = useColorModeValue('gray.900', 'white')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const primaryColor = '#F46739'

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
    // Reset state
    setNewPin('')
    setConfirmPin('')
  }

  const handleCancel = () => {
    setNewPin('')
    setConfirmPin('')
    setError('')
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
                Set transaction pin
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                Create new transaction pin for your transactions
              </Text>
            </VStack>

            {/* New PIN input */}
            <VStack align="flex-start" spacing={3}>
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                New Pin
              </Text>
              <HStack spacing={3}>
                <PinInput
                  value={newPin}
                  onChange={setNewPin}
                  size="lg"
                  type="number"
                  mask
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
              </HStack>
            </VStack>

            {/* Confirm PIN input */}
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
                  mask
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
              </HStack>
            </VStack>

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
                onClick={handleCreatePin}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
              >
                Create Pin
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
