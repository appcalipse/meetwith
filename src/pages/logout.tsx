import { Container, VStack } from '@chakra-ui/react'
import { queryClient } from '@utils/react_query'
import router, { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'
import { useActiveWallet } from 'thirdweb/react'

import Loading from '../components/Loading'
import { AccountContext } from '../providers/AccountProvider'

export default function LogoutPage() {
  const { logout } = useContext(AccountContext)
  useEffect(() => {
    doLogout()
  }, [])

  const wallet = useActiveWallet()

  const doLogout = async () => {
    queryClient.clear()
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
