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
      onSuccess: () => {
        showSuccessToast('Success', 'Email updated successfully')
        setIsChangeEmailModalOpen(false)
        setIsSuccessModalOpen(true)
        setEmailChangeSuccessful(true) // Mark email change as successful
      },
      onError: (error: unknown) => {
        handleApiError('Error updating email', error)
        console.error('Error updating email:', error)
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
