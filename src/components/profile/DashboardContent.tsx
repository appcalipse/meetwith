import { Box, Flex, HStack } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import React, { useContext } from 'react'

import RedirectHandler from '@/components/redirect'

import { AccountContext } from '../../providers/AccountProvider'
import { EditMode } from '../../types/Dashboard'
import AvailabilityConfig from '../availabilities/availability-config'
import Loading from '../Loading'
import NotificationsConfig from '../notifications/NotificationConfig'
import AccountDetails from './AccountDetails'
import { NavMenu } from './components/NavMenu'
import ConnectCalendar from './ConnectCalendar'
import Contact from './Contact'
import Meetings from './Meetings'
import MeetingSettings from './MeetingSettings'

const GroupWithNoSSR = dynamic(() => import('./Group'), { ssr: false })

const DashboardContent: React.FC<{ currentSection?: EditMode }> = ({
  currentSection,
}) => {
  const { currentAccount } = useContext(AccountContext)

  const renderSelected = () => {
    switch (currentSection) {
      case EditMode.MEETINGS:
        return <Meetings currentAccount={currentAccount!} />
      case EditMode.GROUPS:
        return <GroupWithNoSSR currentAccount={currentAccount!} />
      case EditMode.CONTACTS:
        return <Contact currentAccount={currentAccount!} />
      case EditMode.AVAILABILITY:
        return <AvailabilityConfig currentAccount={currentAccount!} />
      case EditMode.DETAILS:
        return <AccountDetails currentAccount={currentAccount!} />
      case EditMode.MEETING_SETTINGS:
        return <MeetingSettings currentAccount={currentAccount!} />
      case EditMode.CALENDARS:
        return <ConnectCalendar currentAccount={currentAccount!} />
      case EditMode.NOTIFICATIONS:
        return <NotificationsConfig currentAccount={currentAccount!} />
    }
  }

  return currentAccount ? (
    <HStack
      alignItems="start"
      width="100%"
      maxWidth="100%"
      justifyContent="space-between"
    >
      <RedirectHandler />
      <Box flex={{ base: '0', lg: '4' }} mr={{ base: 0, lg: 18 }}>
        <NavMenu currentSection={currentSection} />
      </Box>
      <Box
        maxWidth="100%"
        overflow="hidden"
        flex={{ base: '1', md: '8' }}
        marginLeft={{ base: '0 !important', md: 2 }}
        marginInlineStart={{ base: '0 !important', md: 2 }}
      >
        {renderSelected()}
      </Box>
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
