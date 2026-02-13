import { Box } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import SuccessModal from '@/components/profile/components/SuccessModal'
import TransactionPinModal from '@/components/profile/components/TransactionPinModal'
import { enablePinWithToken } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

const EnablePinPage = () => {
  const router = useRouter()
  const { token } = router.query
  const { showSuccessToast } = useToastHelpers()
  const [isEnableModalOpen, setIsEnableModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pinEnableSuccessful, setPinEnableSuccessful] = useState(false)

  useEffect(() => {
    if (token && typeof token === 'string') {
      if (!pinEnableSuccessful) {
        setIsEnableModalOpen(true)
      }
    }
    setIsLoading(false)
  }, [token, pinEnableSuccessful])

  // Enable PIN mutation
  const enablePinMutation = useMutation(
    async (pin: string) => {
      if (!token || Array.isArray(token)) {
        throw new Error('Invalid token')
      }

      return await enablePinWithToken(pin, token)
    },
    {
      onError: (error: unknown) => {
        handleApiError('Error enabling transaction PIN', error)
        console.error('Error enabling PIN:', error)
      },
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN enabled successfully')
        setIsEnableModalOpen(false)
        setIsSuccessModalOpen(true)
        setPinEnableSuccessful(true) // Mark as successful
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
        alignItems="center"
        bg="bg-surface"
        display="flex"
        justifyContent="center"
        minH="100vh"
      >
        <CustomLoading />
      </Box>
    )
  }

  return (
    <Box
      alignItems="center"
      bg="bg-surface"
      display="flex"
      justifyContent="center"
      minH="100vh"
    >
      {/* Enable PIN Modal */}
      <TransactionPinModal
        isLoading={enablePinMutation.isLoading}
        isOpen={isEnableModalOpen}
        mode="create"
        onClose={() => setIsEnableModalOpen(true)}
        onPinCreated={handlePinEnable}
      />

      {/* Success Modal */}
      <SuccessModal
        buttonText="Go back to Dashboard"
        isOpen={isSuccessModalOpen}
        message="You have successfully set up your transaction PIN for secure transactions"
        onButtonClick={handleBackToDashboard}
        onClose={() => setIsSuccessModalOpen(true)}
        title="Transaction PIN enabled successfully"
      />
    </Box>
  )
}

export default EnablePinPage
