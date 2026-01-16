import { Box } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomLoading from '@/components/CustomLoading'
import ChangeEmailModal from '@/components/profile/components/ChangeEmailModal'
import SuccessModal from '@/components/profile/components/SuccessModal'
import { changeEmailWithToken } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'

const ChangeEmailPage = () => {
  const router = useRouter()
  const { token } = router.query
  const { showSuccessToast } = useToastHelpers()
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [emailChangeSuccessful, setEmailChangeSuccessful] = useState(false)

  useEffect(() => {
    if (token && typeof token === 'string') {
      if (!emailChangeSuccessful) {
        setIsChangeEmailModalOpen(true)
      }
    }
    setIsLoading(false)
  }, [token, emailChangeSuccessful])

  // Change email mutation
  const changeEmailMutation = useMutation(
    async (email: string) => {
      if (!token || Array.isArray(token)) {
        throw new Error('Invalid token')
      }

      return await changeEmailWithToken(email, token)
    },
    {
      onError: (error: unknown) => {
        handleApiError('Error updating email', error)
        console.error('Error updating email:', error)
      },
      onSuccess: () => {
        showSuccessToast('Success', 'Email updated successfully')
        setIsChangeEmailModalOpen(false)
        setIsSuccessModalOpen(true)
        setEmailChangeSuccessful(true) // Mark email change as successful
      },
    }
  )

  const handleEmailChange = async (email: string) => {
    changeEmailMutation.mutate(email)
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
      {/* Change Email Modal */}
      <ChangeEmailModal
        isLoading={changeEmailMutation.isLoading}
        isOpen={isChangeEmailModalOpen}
        onClose={() => setIsChangeEmailModalOpen(true)}
        onEmailChange={handleEmailChange}
      />

      {/* Success Modal */}
      <SuccessModal
        buttonText="Go back to Dashboard"
        isOpen={isSuccessModalOpen}
        message="You have successfully updated your account & notification email"
        onButtonClick={handleBackToDashboard}
        onClose={() => setIsSuccessModalOpen(true)}
        title="Email update was successful"
      />
    </Box>
  )
}

export default ChangeEmailPage
