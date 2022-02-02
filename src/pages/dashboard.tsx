import { Container } from '@chakra-ui/layout'
import React from 'react'

import { Navbar } from '../components/Navbar'
import DashboardContent from '../components/profile/DashboardContent'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'
import { withLoginRedirect } from '../session/requireAuthentication'

const Dashboard: React.FC = () => {
  return (
    <>
      <Navbar />
      <Container maxW="6xl" mt={8} flex={1}>
        <DashboardContent />
      </Container>
    </>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(Dashboard))
