import { Container, useToast, VStack } from '@chakra-ui/react'
import { queryClient } from '@utils/react_query'
import router from 'next/router'
import { useContext, useEffect } from 'react'
import { useActiveWallet } from 'thirdweb/react'

import Loading from '../components/Loading'
import { AccountContext } from '../providers/AccountProvider'

export default function LogoutPage() {
  const { logout } = useContext(AccountContext)
  const toast = useToast()
  useEffect(() => {
    doLogout()
  }, [])

  const wallet = useActiveWallet()

  const doLogout = async () => {
    queryClient.clear()
    toast.closeAll()
    logout(wallet!)
    await router.push('/')
  }

  return (
    <>
      <Container maxW="7xl" mt={8} flex={1}>
        <VStack alignItems="center" py={10} px={6}>
          <Loading label="Logging out..." />
        </VStack>
      </Container>
    </>
  )
}
