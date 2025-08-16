import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import SuccessModal from '@/components/profile/components/SuccessModal'
import TransactionPinModal from '@/components/profile/components/TransactionPinModal'
import { savePaymentPreferences } from '@/utils/api_helper'
import { isTokenExpired, verifyToken } from '@/utils/jwt_helper'
import { useToastHelpers } from '@/utils/toasts'

const EnablePinPage = () => {
  const router = useRouter()
  const { token, address } = router.query
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [isEnableModalOpen, setIsEnableModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pinEnableSuccessful, setPinEnableSuccessful] = useState(false)

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
              decodedToken.type === 'enable_pin' &&
              decodedToken.account_address === address
            ) {
              setIsValidToken(true)
              // Only open the modal if PIN enable hasn't been successful yet
              if (!pinEnableSuccessful) {
                setIsEnableModalOpen(true)
              }
            } else {
              showErrorToast(
                'Invalid Token',
                'This enable link is not valid for your account'
              )
            }
          } else {
            showErrorToast(
              'Expired Token',
              'This enable link has expired. Please request a new one.'
            )
          }
        } catch (error) {
          showErrorToast(
            'Invalid Token',
            'This enable link is invalid or corrupted'
          )
        }
      }
      setIsLoading(false)
    }

    validateToken()
  }, [token, address, showErrorToast, pinEnableSuccessful])

  // Enable PIN mutation
  const enablePinMutation = useMutation(
    async (pin: string) => {
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address')
      }

      return await savePaymentPreferences(address, {
        pin_hash: pin, // Will be hashed on server
      })
    },
    {
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN enabled successfully')
        setIsEnableModalOpen(false)
        setIsSuccessModalOpen(true)
        setPinEnableSuccessful(true) // Mark as successful
      },
      onError: (error: unknown) => {
        if (error instanceof Error) {
          showErrorToast('Error', error.message)
        } else {
          showErrorToast('Error', 'Failed to enable transaction PIN')
        }
        console.error('Error enabling PIN:', error)
      },
    }
  )

  const handlePinEnable = async (pin: string) => {
    enablePinMutation.mutate(pin)
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
            This enable PIN link is invalid or has expired. Please request a
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
      {/* Enable PIN Modal */}
      <TransactionPinModal
        isOpen={isEnableModalOpen}
        onClose={() => setIsEnableModalOpen(true)}
        onPinCreated={handlePinEnable}
        isLoading={enablePinMutation.isLoading}
        mode="create"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(true)}
        title="Transaction PIN enabled successfully"
        message="You have successfully set up your transaction PIN for secure transactions"
        buttonText="Go back to Dashboard"
        onButtonClick={handleBackToDashboard}
      />
    </Box>
  )
}

export default EnablePinPage
