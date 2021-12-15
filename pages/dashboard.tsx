import React, { useContext } from 'react'
import { AccountContext } from '../providers/AccountProvider'
import { Container } from '@chakra-ui/layout'
import router from 'next/router'
import DashboardContent from '../components/profile/DashboardContent'

const Dashboard: React.FC = () => {
  const { logged } = useContext(AccountContext)

  if (!logged) {
    router.push('/')
    return <></>
  }

  return (
    <Container maxW="6xl" mt={8} flex={1}>
      <DashboardContent />
    </Container>
  )
}

export default Dashboard
