import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import ChangeEmailModal from '@/components/profile/components/ChangeEmailModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import {
  getNotificationSubscriptions,
  setNotificationSubscriptions,
} from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'

const ChangeEmailPage = () => {
  const router = useRouter()
  const { token, address } = router.query
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Validate token and address on page load
  useEffect(() => {
    if (token && address) {
      // TODO: In production, validate the token against database
      // For now, just check if they exist
      setIsValidToken(true)
      // Auto-open the change email modal
      setIsChangeEmailModalOpen(true)
    }
    setIsLoading(false)
  }, [token, address])

  // Change email mutation
  const changeEmailMutation = useMutation(
    async (email: string) => {
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address')
      }

      // Get current notification subscriptions
      const currentSubs = await getNotificationSubscriptions()
      if (!currentSubs) {
        throw new Error('Could not fetch current notification settings')
      }

      // Update email notification
      const updatedSubs = {
        ...currentSubs,
        notification_types: currentSubs.notification_types.map((sub: any) =>
          sub.channel === 'email' ? { ...sub, destination: email } : sub
        ),
      }

      return await setNotificationSubscriptions(updatedSubs)
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Email updated successfully')
        setIsChangeEmailModalOpen(false)
        setIsSuccessModalOpen(true)
      },
      onError: (error: unknown) => {
        if (error instanceof Error) {
          showErrorToast('Error', error.message)
        } else {
          showErrorToast('Error', 'Failed to update email')
        }
        console.error('Error updating email:', error)
      },
    }
  )

  const handleEmailChange = async (email: string) => {
    setNewEmail(email)
    changeEmailMutation.mutate(email)
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <Box
        minH="100vh"
        bg="dark.900"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CustomLoading />
      </Box>
    )
  }

  if (!isValidToken) {
    return (
      <Box
        minH="100vh"
        bg="dark.900"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={6} textAlign="center">
          <Heading color="white">Invalid or Expired Link</Heading>
          <Text color="gray.400">
            This change email link is invalid or has expired.
          </Text>
          <Button onClick={handleBackToDashboard} colorScheme="primary">
            Go to Dashboard
          </Button>
        </VStack>
      </Box>
    )
  }

  return (
    <Box
      minH="100vh"
      bg="dark.900"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {/* Change Email Modal */}
      <ChangeEmailModal
        isOpen={isChangeEmailModalOpen}
        onClose={() => setIsChangeEmailModalOpen(true)}
        onEmailChange={handleEmailChange}
        isLoading={changeEmailMutation.isLoading}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(true)}
        title="Email update was successful"
        message="You have successfully updated your account & notification email"
        buttonText="Go back to Dashboard"
        onButtonClick={handleBackToDashboard}
      />
    </Box>
  )
}

export default ChangeEmailPage
