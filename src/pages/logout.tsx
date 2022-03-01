import { Container, VStack } from '@chakra-ui/react'
import router from 'next/router'
import { useContext, useEffect } from 'react'

import Loading from '../components/Loading'
import { AccountContext } from '../providers/AccountProvider'

export default function LogoutPage() {
  const { logout } = useContext(AccountContext)

  useEffect(() => {
    logout()
    router.replace('/')
  }, [])

  return (
    <>
      <Container maxW="7xl" mt={8} flex={1}>
        <VStack alignItems="center" py={10} px={6}>
          <Loading label="Logging you out..." />
        </VStack>
      </Container>
    </>
  )
}
