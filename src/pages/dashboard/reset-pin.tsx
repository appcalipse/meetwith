import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import ResetPinModal from '@/components/profile/components/ResetPinModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import { savePaymentPreferences } from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'

const ResetPinPage = () => {
  const router = useRouter()
  const { token, address } = router.query
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Validate token and address on page load
  useEffect(() => {
    if (token && address) {
      // TODO: In production, validate the token against database
      // For now, just check if they exist
      setIsValidToken(true)
      // Auto-open the reset PIN modal
      setIsResetModalOpen(true)
    }
    setIsLoading(false)
  }, [token, address])

  // Reset PIN mutation
  const resetPinMutation = useMutation(
    async (newPin: string) => {
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address')
      }

      return await savePaymentPreferences(address, {
        pin_hash: newPin, // Will be hashed on server
      })
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN reset successfully')
        setIsResetModalOpen(false)
        setIsSuccessModalOpen(true)
      },
      onError: (error: unknown) => {
        if (error instanceof Error) {
          showErrorToast('Error', error.message)
        } else {
          showErrorToast('Error', 'Failed to reset transaction PIN')
        }
        console.error('Error resetting PIN:', error)
      },
    }
  )

  const handlePinReset = async (newPin: string) => {
    resetPinMutation.mutate(newPin)
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
            This reset link is invalid or has expired.
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
      {/* Reset PIN Modal */}
      <ResetPinModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(true)}
        onPinReset={handlePinReset}
        isLoading={resetPinMutation.isLoading}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(true)}
        title="Transaction pin reset was successful"
        message="You have successfully updated your account & notification email"
        buttonText="Go back to Dashboard"
        onButtonClick={handleBackToDashboard}
      />
    </Box>
  )
}

export default ResetPinPage
