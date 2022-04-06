import { Container } from '@chakra-ui/layout'
import { useRouter } from 'next/router'
import React from 'react'

import DashboardContent from '../../components/profile/DashboardContent'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { withLoginRedirect } from '../../session/requireAuthentication'
import { EditMode } from '../../types/Dashboard'

const Dashboard: React.FC = () => {
  const router = useRouter()
  const { section } = router.query
  return (
    <Container data-testid={`dashboard-${section}`} maxW="6xl" mt={8} flex={1}>
      <DashboardContent currentSection={section as EditMode} />
    </Container>
  )
}

export default withLoginRedirect(forceAuthenticationCheck(Dashboard))
