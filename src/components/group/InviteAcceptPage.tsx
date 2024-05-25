import { useToast } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import GroupOnboardingModal from '@/components/group/GroupOnboardingModal'
import { useLogin } from '@/session/login'

const InviteAcceptPage = () => {
  const router = useRouter()
  const toast = useToast()
  const { handleLogin, logged, currentAccount, loginIn } = useLogin()
  const { groupId, email } = router.query
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId || !email) {
      toast({
        title: 'Invalid invite',
        description: 'The invite link is invalid.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      router.push('/')
      return
    }

    const checkInvite = async () => {
      try {
        setLoading(true)
        // Here you might want to verify the invite in the backend
        // If verification is needed, implement the logic here
        setLoading(false)
      } catch (error) {
        toast({
          title: 'Failed to verify invite',
          // description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        router.push('/')
      }
    }

    checkInvite()
  }, [groupId, email, router, toast])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <GroupOnboardingModal groupId={groupId as string} email={email as string} />
  )
}

export default InviteAcceptPage
