import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import React, { useContext, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { updateGuestParticipantDetails } from '@/utils/api_helper'
import { updatePollParticipantAvailability } from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'
import { isValidEmail } from '@/utils/validations'

interface GuestDetailsFormProps {
  participantId: string
  onSuccess: () => void
  pollTitle?: string
  onNavigateBack?: () => void
}

const GuestDetailsForm: React.FC<GuestDetailsFormProps> = ({
  participantId,
  onSuccess,
  onNavigateBack,
}) => {
  const router = useRouter()
  const { openConnection } = useContext(OnboardingModalContext)
  const {
    guestAvailabilitySlots,
    currentTimezone,
    clearGuestAvailabilitySlots,
  } = useQuickPollAvailability()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showErrorToast } = useToastHelpers()

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      showErrorToast(
        'Missing information',
        'Please enter both your full name and email address.'
      )
      return
    }

    if (!isValidEmail(email)) {
      showErrorToast('Invalid email', 'Please enter a valid email address.')
      return
    }

    setIsLoading(true)

    try {
      // Save guest details
      await updateGuestParticipantDetails(
        participantId,
        fullName.trim(),
        email.trim()
      )

      if (guestAvailabilitySlots.length > 0) {
        await updatePollParticipantAvailability(
          participantId,
          guestAvailabilitySlots,
          currentTimezone
        )
      }

      clearGuestAvailabilitySlots()
      onSuccess()
    } catch (error) {
      showErrorToast(
        'Failed to save details',
        'There was an error saving your details. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = () => {
    openConnection()
  }

  const handleSignUp = () => {
    openConnection()
  }

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack()
    } else {
      router.back()
    }
  }

  return (
    <Box
      minH="100vh"
      bg="bg-surface"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      px={{ base: 4, md: 4 }}
    >
      <Box maxW="550px" w="100%" bg="bg-surface" p={{ base: 6, md: 8 }}>
        {/* Back Button */}
        <HStack
          mb={{ base: 4, md: 6 }}
          cursor="pointer"
          onClick={handleBack}
          _hover={{ opacity: 0.8 }}
          w="fit-content"
        >
          <Icon as={FaArrowLeft} color="#F35826" />
          <Text
            color="orangeButton.300"
            fontSize={{ base: '14px', md: '16px' }}
            fontWeight="500"
          >
            Back
          </Text>
        </HStack>

        <Heading
          fontSize={{ base: '20px', md: '24px' }}
          fontWeight="700"
          color="text-primary"
          textAlign="left"
          mb={{ base: 4, md: 5 }}
        >
          Provide your details
        </Heading>

        <Text
          fontSize={{ base: '14px', md: '16px' }}
          color="text.primary"
          textAlign="left"
          lineHeight="1.5"
          mb={{ base: 6, md: 8 }}
        >
          You are saving your availability for this poll as a guest. This means
          you won&apos;t be able to edit it later.
        </Text>

        {/* Form */}
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
            <Input
              placeholder="Enter your name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              bg="bg-surface"
              borderColor="border-default"
              color="text-primary"
              fontSize={{ base: '14px', md: '16px' }}
              height={{ base: '44px', md: '48px' }}
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
              isDisabled={isLoading}
            />
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
              isDisabled={isLoading}
            />
          </FormControl>

          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText="Saving..."
            bg="primary.200"
            color="neutral.900"
            fontSize={{ base: '14px', md: '16px' }}
            fontWeight="600"
            height={{ base: '44px', md: '48px' }}
            borderRadius="8px"
            _hover={{ bg: 'primary.300' }}
            _active={{ bg: 'primary.400' }}
            _disabled={{
              bg: 'primary.200',
              color: 'text-primary',
              opacity: 0.3,
            }}
            isDisabled={!fullName.trim() || !email.trim() || isLoading}
          >
            Save
          </Button>

          <VStack spacing={2} align="flex-start" mt={4}>
            <Text
              fontSize="16px"
              fontWeight="700"
              color="text-primary"
              textAlign="left"
            >
              Already have an account?{' '}
              <Text
                as="span"
                color="primary.200"
                cursor="pointer"
                textDecoration="underline"
                onClick={handleSignIn}
                _hover={{ opacity: 0.8 }}
              >
                Sign in
              </Text>{' '}
              to save and edit your availability later.
            </Text>

            <Text
              fontSize="16px"
              color="text-primary"
              fontWeight="700"
              textAlign="left"
            >
              or
            </Text>

            <Text
              fontSize="16px"
              color="text-primary"
              fontWeight="700"
              textAlign="left"
            >
              If you have no account?{' '}
              <Text
                as="span"
                color="primary.200"
                cursor="pointer"
                textDecoration="underline"
                onClick={handleSignUp}
                _hover={{ opacity: 0.8 }}
                textAlign="left"
              >
                Sign up
              </Text>
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  )
}

export default GuestDetailsForm
