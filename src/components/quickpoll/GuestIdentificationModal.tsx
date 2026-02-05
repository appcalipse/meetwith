import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'

import { useToastHelpers } from '@/utils/toasts'
import { isValidEmail } from '@/utils/validations'

interface GuestIdentificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (email: string) => void
  pollTitle?: string
}

const GuestIdentificationModal: React.FC<GuestIdentificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pollTitle,
}) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showErrorToast } = useToastHelpers()

  const isEmailValid = isValidEmail(email)

  const handleSubmit = async () => {
    if (!email.trim()) {
      showErrorToast('Email required', 'Please enter your email address.')
      return
    }

    if (!isEmailValid) {
      showErrorToast('Invalid email', 'Please enter a valid email address.')
      return
    }

    setIsLoading(true)

    try {
      await onSubmit(email.trim())
      setEmail('')
      setIsLoading(false)
      onClose()
    } catch (_error) {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setIsLoading(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="md">
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        border="1px solid"
        borderColor="card-border"
        borderRadius="12px"
        mx={4}
        shadow="none"
        boxShadow="none"
      >
        <ModalHeader pb={2}>
          <Heading fontSize="20px" fontWeight="600" color="text-primary">
            Enter your email
          </Heading>
        </ModalHeader>
        <ModalCloseButton color="neutral.0" />

        <ModalBody px={6} pb={6}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="14px" color="neutral.400" lineHeight="1.5">
              Please enter the email address you were invited with to save your
              availability for{' '}
              <Text as="span" color="text-primary" fontWeight="500">
                {pollTitle || 'this poll'}
              </Text>
              .
            </Text>

            <FormControl isRequired>
              <FormLabel
                fontSize="14px"
                fontWeight="500"
                color="text-primary"
                mb={2}
              >
                Email address
              </FormLabel>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                bg="bg-surface"
                borderColor="border-default"
                color="text-primary"
                fontSize="14px"
                height="40px"
                _placeholder={{
                  color: 'neutral.500',
                  fontSize: '14px',
                }}
                _focus={{
                  borderColor: 'neutral.600',
                  boxShadow: 'none',
                }}
                _hover={{
                  borderColor: 'neutral.600',
                }}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleSubmit()
                  }
                }}
                isDisabled={isLoading}
              />
            </FormControl>

            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="Checking participant..."
              bg="primary.200"
              color="neutral.900"
              fontSize="14px"
              fontWeight="600"
              height="40px"
              borderRadius="6px"
              _hover={{ bg: 'primary.300' }}
              _active={{ bg: 'primary.400' }}
              _disabled={{
                bg: 'primary.200',
                opacity: 0.5,
                color: 'neutral.900',
                cursor: 'not-allowed',
              }}
              isDisabled={!email.trim() || !isEmailValid || isLoading}
            >
              Continue
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GuestIdentificationModal
