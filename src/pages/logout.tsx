import {
  Container,
  Heading,
  Image,
  Spacer,
  Text,
  VStack,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext, useEffect } from 'react'

import Loading from '../components/Loading'
import { AccountContext } from '../providers/AccountProvider'
import * as api from '../utils/api_helper'

export default function LogoutPage() {
  const { logout } = useContext(AccountContext)

  useEffect(() => {
    api.logout().then(() => {
      logout()
      router.push('/')
    })
  })

  return (
    <>
      <Container maxW="7xl" mt={8} flex={1}>
        <VStack alignItems="center" py={10} px={6}>
          <Loading />
          Logging you out...
        </VStack>
      </Container>
    </>
  )
}
