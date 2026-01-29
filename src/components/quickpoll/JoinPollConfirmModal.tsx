import {
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'

import { useToastHelpers } from '@/utils/toasts'
import { isValidEmail } from '@/utils/validations'

export interface JoinPollConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  pollTitle?: string
  pollSlug?: string
  pollId: string
  initialFullName?: string
  initialEmail?: string
  isPrefillLoading?: boolean
  onSave: (fullName: string, email: string) => Promise<void>
}

const JoinPollConfirmModal: React.FC<JoinPollConfirmModalProps> = ({
  isOpen,
  onClose,
  pollTitle,
  initialFullName = '',
  initialEmail = '',
  isPrefillLoading = false,
  onSave,
}) => {
  const [fullName, setFullName] = useState(initialFullName)
  const [email, setEmail] = useState(initialEmail)
  const [isLoading, setIsLoading] = useState(false)
  const { showErrorToast } = useToastHelpers()

  useEffect(() => {
    if (isOpen) {
      setFullName(initialFullName)
      setEmail(initialEmail)
    }
  }, [isOpen, initialFullName, initialEmail])

  const handleSubmit = async () => {
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!isValidEmail(trimmedEmail)) {
      showErrorToast('Invalid email', 'Please enter a valid email address.')
      return
    }

    setIsLoading(true)
    try {
      await onSave(trimmedName, trimmedEmail)
    } finally {
      setIsLoading(false)
    }
  }

  const displayTitle = pollTitle ? `"${pollTitle}"` : 'this poll'
  const subheading = `Confirm your name and email to join ${displayTitle} and add your availability.`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="md"
      closeOnOverlayClick={false}
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        borderColor="border-default"
        borderWidth={1}
        borderRadius="md"
        mx={4}
      >
        <ModalBody py={6} px={{ base: 6, md: 8 }}>
          <Heading
            fontSize={{ base: '20px', md: '24px' }}
            fontWeight="700"
            color="text-primary"
            textAlign="left"
            mb={{ base: 4, md: 5 }}
          >
            Provide your details to join poll
          </Heading>

          <Text
            fontSize={{ base: '14px', md: '16px' }}
            color="text.primary"
            textAlign="left"
            lineHeight="1.5"
            mb={{ base: 6, md: 8 }}
          >
            {subheading}
          </Text>

          <VStack spacing={{ base: 5, md: 6 }} align="stretch">
            <FormControl isRequired>
              <FormLabel
                fontSize={{ base: '14px', md: '16px' }}
                fontWeight="500"
                color="text-primary"
                mb={2}
              >
                Full name
              </FormLabel>
              <InputGroup>
                <Input
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  bg="bg-surface"
                  borderColor="border-default"
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  height={{ base: '44px', md: '48px' }}
                  pr={isPrefillLoading ? 9 : undefined}
                  _placeholder={{
                    color: 'neutral.500',
                    fontSize: { base: '14px', md: '16px' },
                  }}
                  _focus={{
                    borderColor: 'neutral.600',
                    boxShadow: 'none',
                  }}
                  _hover={{
                    borderColor: 'neutral.600',
                  }}
                  isDisabled={isLoading || isPrefillLoading}
                />
                {isPrefillLoading && (
                  <InputRightElement height={{ base: '44px', md: '48px' }}>
                    <Spinner size="xs" />
                  </InputRightElement>
                )}
              </InputGroup>
            </FormControl>

            <FormControl isRequired>
              <FormLabel
                fontSize={{ base: '14px', md: '16px' }}
                fontWeight="500"
                color="text-primary"
                mb={2}
              >
                Email address
              </FormLabel>
              <InputGroup>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  bg="bg-surface"
                  borderColor="border-default"
                  color="text-primary"
                  fontSize={{ base: '14px', md: '16px' }}
                  height={{ base: '44px', md: '48px' }}
                  pr={isPrefillLoading ? 9 : undefined}
                  _placeholder={{
                    color: 'neutral.500',
                    fontSize: { base: '14px', md: '16px' },
                  }}
                  _focus={{
                    borderColor: 'neutral.600',
                    boxShadow: 'none',
                  }}
                  _hover={{
                    borderColor: 'neutral.600',
                  }}
                  isDisabled={isLoading || isPrefillLoading}
                />
                {isPrefillLoading && (
                  <InputRightElement height={{ base: '44px', md: '48px' }}>
                    <Spinner size="xs" />
                  </InputRightElement>
                )}
              </InputGroup>
            </FormControl>

            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="Saving..."
              bg="primary.200"
              color="button-text-dark"
              fontSize={{ base: '14px', md: '16px' }}
              fontWeight="600"
              height={{ base: '44px', md: '48px' }}
              borderRadius="8px"
              _hover={{ bg: 'primary.300' }}
              _active={{ bg: 'primary.400' }}
              _disabled={{
                bg: 'primary.200',
                color: 'button-text-dark',
                opacity: 0.3,
              }}
              isDisabled={!fullName.trim() || !email.trim() || isLoading}
            >
              Save
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default JoinPollConfirmModal
