import { Box } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import ResetPinModal from '@/components/profile/components/ResetPinModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import { resetPinWithToken } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

const ResetPinPage = () => {
  const router = useRouter()
  const { token } = router.query
  const { showSuccessToast } = useToastHelpers()
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pinResetSuccessful, setPinResetSuccessful] = useState(false)

  // Set token as valid if present - actual verification happens on server
  useEffect(() => {
    if (token && typeof token === 'string') {
      if (!pinResetSuccessful) {
        setIsResetModalOpen(true)
      }
    }
    setIsLoading(false)
  }, [token, pinResetSuccessful])

  // Reset PIN mutation
  const resetPinMutation = useMutation(
    async (newPin: string) => {
      if (!token || Array.isArray(token)) {
        throw new Error('Invalid token')
      }

      return await resetPinWithToken(newPin, token)
    },
    {
      onError: (error: unknown) => {
        handleApiError('Error resetting transaction PIN', error)
        console.error('Error resetting PIN:', error)
      },
      onSuccess: () => {
        showSuccessToast('Success', 'Transaction PIN reset successfully')
        setIsResetModalOpen(false)
        setIsSuccessModalOpen(true)
        setPinResetSuccessful(true) // Mark PIN as reset
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
      {/* Reset PIN Modal */}
      <ResetPinModal
        isLoading={resetPinMutation.isLoading}
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(true)}
        onPinReset={handlePinReset}
      />

      {/* Success Modal */}
      <SuccessModal
        buttonText="Go back to Dashboard"
        isOpen={isSuccessModalOpen}
        message="You have successfully reset your transaction PIN for secure transactions"
        onButtonClick={handleBackToDashboard}
        onClose={() => setIsSuccessModalOpen(true)}
        title="Transaction pin reset was successful"
      />
    </Box>
  )
}

export default ResetPinPage
