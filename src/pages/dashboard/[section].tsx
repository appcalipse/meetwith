import { Container } from '@chakra-ui/layout'
import TawkMessengerReact from '@tawk.to/tawk-messenger-react'
import { NextPage } from 'next'

import { isProduction } from '@/utils/constants'

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
      }}
      mt={{ base: 16, md: 8 }}
      flex={1}
      px={{ base: 5, md: 8 }}
    >
      {isProduction && (
        <TawkMessengerReact
          propertyId={process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID!}
          widgetId={process.env.NEXT_PUBLIC_TAWK_WIDGET_ID!}
        />
      )}
      <DashboardContent currentSection={props.section} />
    </Container>
  )
}

const EnhancedDashboard: NextPage<DashboardProps> =
  forceAuthenticationCheck<DashboardProps>(Dashboard)

EnhancedDashboard.getInitialProps = async ctx => {
  const { section } = ctx.query
  const singleSection = Array.isArray(section) ? section[0] : section
  return { section: singleSection as EditMode }
}

export default withLoginRedirect(EnhancedDashboard)
