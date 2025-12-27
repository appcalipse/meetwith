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
      maxW={{
        base: '100%',
        '2xl': props.section === EditMode.MEETINGS ? undefined : '8xl',
      }}
      mt={{ base: 16, md: 8 }}
      flex={1}
      px={{ base: 5, md: 8 }}
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
