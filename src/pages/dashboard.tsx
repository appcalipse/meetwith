import React, { useContext } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import { Container, Flex } from '@chakra-ui/layout'
import router from 'next/router'
import DashboardContent from '../components/profile/DashboardContent'
import Loading from '../components/Loading'

const Dashboard: React.FC = () => {
  const { logged } = useContext(AccountContext)

  if (!logged) {
    router.push('/')
    return (
      <Flex
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
      >
        <Loading />
      </Flex>
    )
  }

  return (
    <Container maxW="6xl" mt={8} flex={1}>
      <DashboardContent />
    </Container>
  )
}

export default Dashboard
