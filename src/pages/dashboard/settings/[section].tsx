import { Container } from '@chakra-ui/layout'
import { NextPage } from 'next'

import DashboardContent from '../../../components/profile/DashboardContent'
import { forceAuthenticationCheck } from '../../../session/forceAuthenticationCheck'
import { withLoginRedirect } from '../../../session/requireAuthentication'
import { SettingsSection } from '../../../types/Dashboard'

interface SettingsProps {
  section: SettingsSection
}
const Settings: NextPage<SettingsProps> = props => {
  return (
    <Container
      data-testid={`dashboard-settings-${props.section}`}
      maxW={{
        base: '100%',
        '2xl': '8xl',
      }}
      mt={{ base: 16, md: 8 }}
      flex={1}
      px={{ base: 5, md: 8 }}
    >
      <DashboardContent currentSection={props.section} />
    </Container>
  )
}

const EnhancedSettings: NextPage<SettingsProps> =
  forceAuthenticationCheck<SettingsProps>(Settings)

EnhancedSettings.getInitialProps = async ctx => {
  const { section } = ctx.query
  const singleSection = Array.isArray(section) ? section[0] : section
  return { section: singleSection as SettingsSection }
}

export default withLoginRedirect(EnhancedSettings)
