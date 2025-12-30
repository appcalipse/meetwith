import { Box, Flex, HStack } from '@chakra-ui/react'
import { EditMode } from '@meta/Dashboard'
import React, { useContext } from 'react'
import { useLocalStorage } from 'usehooks-ts'

import NotFound from '@/pages/404'
import { AccountContext } from '@/providers/AccountProvider'
import MetricStateProvider from '@/providers/MetricStateProvider'
import { WalletProvider } from '@/providers/WalletProvider'

import AvailabilityConfig from '../availabilities/AvailabilityConfig'
import Loading from '../Loading'
import NotificationsConfig from '../notifications/NotificationConfig'
import QuickPoll from '../quickpoll/QuickPoll'
import RedirectHandler from '../redirect'
import Clientboard from './Clientboard'
import { NavMenu } from './components/NavMenu'
import ConnectCalendar from './ConnectCalendar'
import Contact from './Contact'
import Group from './Group'
import Meetings from './Meetings'
import MeetingSettings from './MeetingSettings'
import Settings from './Settings'
import Wallet from './Wallet'

const DashboardContent: React.FC<{ currentSection?: EditMode }> = ({
  currentSection,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const [isOpened, setIsOpened] = useLocalStorage('SIDEBAR::OPENED', true)
  const isSettings = currentSection === EditMode.DETAILS
  const isSchedule = currentSection === EditMode.MEETINGS

  const renderSelected = () => {
    switch (currentSection) {
      case EditMode.MEETINGS:
        return <Meetings currentAccount={currentAccount!} />
      case EditMode.GROUPS:
        return <Group currentAccount={currentAccount!} />
      case EditMode.CONTACTS:
        return <Contact currentAccount={currentAccount!} />
      case EditMode.AVAILABILITY:
        return <AvailabilityConfig currentAccount={currentAccount!} />
      case EditMode.DETAILS:
        return <Settings currentAccount={currentAccount!} />
      case EditMode.MEETING_SETTINGS:
        return <MeetingSettings currentAccount={currentAccount!} />
      case EditMode.CALENDARS:
        return <ConnectCalendar currentAccount={currentAccount!} />
      case EditMode.NOTIFICATIONS:
        return <NotificationsConfig currentAccount={currentAccount!} />
      case EditMode.WALLET:
        return (
          <WalletProvider>
            <Wallet currentAccount={currentAccount!} />
          </WalletProvider>
        )
      case EditMode.CLIENTBOARD:
        return <Clientboard currentAccount={currentAccount!} />
      case EditMode.QUICKPOLL:
        return <QuickPoll currentAccount={currentAccount!} />
      default:
        return <NotFound />
    }
  }

  return currentAccount ? (
    <MetricStateProvider currentAccount={currentAccount}>
      <HStack
        alignItems="start"
        width="100%"
        maxWidth="100%"
        justifyContent="space-between"
        pl={{
          base: 0,
          lg: !isSettings ? (!isOpened ? '100px' : '23%') : 0,
        }}
        pr={isSettings ? 0 : 8}
      >
        <RedirectHandler />
        {!isSettings && (
          <Box
            flex={{ base: '0', lg: '4' }}
            mr={{ base: 0, lg: 18 }}
            position="fixed"
            left={0}
            top={0}
            zIndex={10}
          >
            <NavMenu
              currentSection={currentSection}
              isOpened={isOpened}
              toggleSidebar={() => setIsOpened(!isOpened)}
            />
          </Box>
        )}
        <Box
          maxWidth="100%"
          overflow="hidden"
          flex={isSettings ? 1 : { base: '1', md: '8' }}
          marginLeft={{ base: '0 !important', md: isSettings ? 0 : 2 }}
          marginInlineStart={{ base: '0 !important', md: isSettings ? 0 : 2 }}
          pt={{ base: isSettings ? '0' : '60px', lg: 0 }}
        >
          {renderSelected()}
        </Box>
      </HStack>
    </MetricStateProvider>
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
