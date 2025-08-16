import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

interface ChangeEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onEmailChange: (newEmail: string) => void
  isLoading?: boolean
}

const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  isOpen,
  onClose,
  onEmailChange,
  isLoading = false,
}) => {
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')

  const textColor = useColorModeValue('gray.900', 'white')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const primaryColor = '#F46739'

  // Clear inputs whenever modal closes
  useEffect(() => {
    if (!isOpen) {
      clearInputs()
    }
  }, [isOpen])

  const handleEmailChange = () => {
    if (!newEmail.trim()) {
      setError('Please enter a new email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    onEmailChange(newEmail)
  }

  const clearInputs = () => {
    setNewEmail('')
    setError('')
  }

  const handleCancel = () => {
    clearInputs()
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
            <Box mb={2}>
              <Button
                variant="ghost"
                p={0}
                minW="auto"
                onClick={handleCancel}
                _hover={{ bg: 'transparent' }}
                leftIcon={<FaArrowLeft color={primaryColor} size={20} />}
                color="primary.400"
                fontWeight="medium"
                fontSize="sm"
              >
                Back
              </Button>
            </Box>

            {/* Title */}
            <VStack align="flex-start" spacing={2}>
              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                Update your account email
              </Text>
            </VStack>

            {/* Email input */}
            <VStack align="flex-start" spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={textColor}>
                  New Email address
                </FormLabel>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Enter your new email address"
                  size="lg"
                  bg="transparent"
                  borderColor="neutral.400"
                  _hover={{ borderColor: 'gray.400' }}
                  _focus={{ borderColor: 'primary.300', boxShadow: 'none' }}
                />
              </FormControl>
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
                onClick={handleEmailChange}
                size="md"
                borderRadius="8px"
                px="16px"
                py="12px"
                isLoading={isLoading}
                loadingText="Saving email..."
                isDisabled={isLoading}
              >
                Save email
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

export default ChangeEmailModal
