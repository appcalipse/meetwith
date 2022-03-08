import { Container } from '@chakra-ui/layout'
import React from 'react'

import DashboardContent, {
  EditMode,
} from '../../components/profile/DashboardContent'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { withLoginRedirect } from '../../session/requireAuthentication'

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
