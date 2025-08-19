import { useToast } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

const RedirectNotifier = () => {
  const { query } = useRouter()
  const toast = useToast()
  const { openConnection } = useContext(OnboardingModalContext)
  const { currentAccount } = useContext(AccountContext)

  useEffect(() => {
    if (query.redirect && !currentAccount) {
      toast({
        title: 'Session expired',
        description: 'Your session has expired. Please sign to continue.',
        status: 'warning',
        duration: 15000,
        isClosable: true,
        position: 'top',
      })
      openConnection()
    }
  }, [query, currentAccount])

  return null
}

export default RedirectNotifier
