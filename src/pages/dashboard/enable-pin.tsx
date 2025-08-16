import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import SuccessModal from '@/components/profile/components/SuccessModal'
import TransactionPinModal from '@/components/profile/components/TransactionPinModal'
import { savePaymentPreferences } from '@/utils/api_helper'
import { useToastHelpers } from '@/utils/toasts'

const EnablePinPage = () => {
  const router = useRouter()
  const { token, address } = router.query
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const [isEnableModalOpen, setIsEnableModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Validate token and address on page load
  useEffect(() => {
    if (token && address) {
      // TODO: In production, validate the token against database
      // For now, just check if they exist
      setIsValidToken(true)
      // Auto-open the enable PIN modal
      setIsEnableModalOpen(true)
    }
    setIsLoading(false)
  }, [token, address])

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
            This enable PIN link is invalid or has expired.
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
        onClose={() => setIsEnableModalOpen(false)}
        onPinCreated={handlePinEnable}
        isLoading={enablePinMutation.isLoading}
        mode="create"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Transaction PIN enabled successfully"
        message="You have successfully set up your transaction PIN for secure transactions"
        buttonText="Go back to Dashboard"
        onButtonClick={handleBackToDashboard}
      />
    </Box>
  )
}

export default EnablePinPage
