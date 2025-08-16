import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import ResetPinModal from '@/components/profile/components/ResetPinModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import { savePaymentPreferences } from '@/utils/api_helper'
import { isTokenExpired, verifyToken } from '@/utils/jwt_helper'
import { useToastHelpers } from '@/utils/toasts'

const ResetPinPage = () => {
  const router = useRouter()
  const { token, address } = router.query
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pinResetSuccessful, setPinResetSuccessful] = useState(false)

  // Validate JWT token on page load
  useEffect(() => {
    const validateToken = async () => {
      if (token && address && typeof token === 'string') {
        try {
          // Verify the JWT token
          const decodedToken = await verifyToken(token)

          if (decodedToken && !(await isTokenExpired(token))) {
            // Check if token type matches and address matches
            if (
              decodedToken.type === 'reset_pin' &&
              decodedToken.account_address === address
            ) {
              setIsValidToken(true)
              // Only open the modal if PIN reset hasn't been successful yet
              if (!pinResetSuccessful) {
                setIsResetModalOpen(true)
              }
            } else {
              showErrorToast(
                'Invalid Token',
                'This reset link is not valid for your account'
              )
            }
          } else {
            showErrorToast(
              'Expired Token',
              'This reset link has expired. Please request a new one.'
            )
          }
        } catch (error) {
          showErrorToast(
            'Invalid Token',
            'This reset link is invalid or corrupted'
          )
        }
      }
      setIsLoading(false)
    }

    validateToken()
  }, [token, address, showErrorToast, pinResetSuccessful])

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
        setPinResetSuccessful(true) // Mark PIN as reset
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
            This reset link is invalid or has expired. Please request a new one.
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
        message="You have successfully reset your transaction PIN for secure transactions"
        buttonText="Go back to Dashboard"
        onButtonClick={handleBackToDashboard}
      />
    </Box>
  )
}

export default ResetPinPage
