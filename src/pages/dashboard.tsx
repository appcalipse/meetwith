import React from 'react'
import { Container } from '@chakra-ui/layout'
import DashboardContent from '../components/profile/DashboardContent'
import { withLoginRedirect } from '../session/requireAuthentication'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'

const Dashboard: React.FC = () => {
  return (
    <Container maxW="6xl" mt={8} flex={1}>
      <DashboardContent />
    </Container>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(Dashboard))
