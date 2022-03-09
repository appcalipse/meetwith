import { Container } from '@chakra-ui/layout'
import React from 'react'

import DashboardContent from '../../components/profile/DashboardContent'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { withLoginRedirect } from '../../session/requireAuthentication'
import { EditMode } from '../../types/Dashboard'

const Dashboard: React.FC = () => {
  return (
    <>
      <Container maxW="6xl" mt={8} flex={1}>
        <DashboardContent currentSection={EditMode.MEETINGS} />
      </Container>
    </>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(Dashboard))
