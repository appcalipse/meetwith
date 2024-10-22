import { Container } from '@chakra-ui/layout'
import { NextPage } from 'next'

import DashboardContent from '../../components/profile/DashboardContent'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { withLoginRedirect } from '../../session/requireAuthentication'
import { EditMode } from '../../types/Dashboard'

interface DashboardProps {
  section: EditMode
}
const Dashboard: NextPage<DashboardProps> = props => {
  return (
    <Container
      data-testid={`dashboard-${props.section}`}
      px={8}
      maxW={{
        base: '100%',
        '2xl': '8xl',
      }}
      mt={36}
      flex={1}
    >
      <DashboardContent currentSection={props.section} />
    </Container>
  )
}

const EnhancedDashboard: NextPage = forceAuthenticationCheck(Dashboard)

EnhancedDashboard.getInitialProps = async ctx => {
  const { section } = ctx.query
  return { section }
}

export default withLoginRedirect(EnhancedDashboard)
