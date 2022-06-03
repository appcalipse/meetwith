import { Box, Flex, HStack } from '@chakra-ui/react'
import React, { useContext } from 'react'

import { AccountContext } from '../../providers/AccountProvider'
import { EditMode } from '../../types/Dashboard'
import AvailabilityConfig from '../availabilities/availability-config'
import Loading from '../Loading'
import NotificationsConfig from '../notifications/NotificationConfig'
import { TokenGateConfig } from '../token-gate/TokenGateConfig'
import AccountDetails from './AccountDetails'
import { NavMenu } from './components/NavMenu'
import ConnectCalendar from './ConnectCalendar'
import Meetings from './Meetings'
import MeetingTypesConfig from './MeetingTypesConfig'

const DashboardContent: React.FC<{ currentSection?: EditMode }> = ({
  currentSection,
}) => {
  const { currentAccount } = useContext(AccountContext)

  const renderSelected = () => {
    switch (currentSection) {
      case EditMode.MEETINGS:
        return <Meetings />
      case EditMode.AVAILABILITY:
        return <AvailabilityConfig />
      case EditMode.DETAILS:
        return <AccountDetails />
      case EditMode.TYPES:
        return <MeetingTypesConfig />
      case EditMode.CALENDARS:
        return <ConnectCalendar />
      case EditMode.NOTIFICATIONS:
        return <NotificationsConfig />
      case EditMode.GATES:
        return <TokenGateConfig />
    }
  }

  return currentAccount ? (
    <HStack alignItems="start" width="100%" flexWrap="wrap">
      <Box flex={{ base: '0', md: '4' }} mr={{ base: 0, md: 18 }}>
        <NavMenu currentSection={currentSection} />
      </Box>
      <Box flex={{ base: '1', md: '8' }}>{renderSelected()}</Box>
    </HStack>
  ) : (
    <Flex
      width="100%"
      height="100%"
      alignItems="center"
      justifyContent="center"
    >
      <Loading />
    </Flex>
  )
}

export default DashboardContent
