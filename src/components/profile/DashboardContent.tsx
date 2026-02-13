import { Box, Flex, HStack } from '@chakra-ui/react'
import React, { useContext } from 'react'
import { useLocalStorage } from 'usehooks-ts'

import NotFound from '@/pages/404'
import { AccountContext } from '@/providers/AccountProvider'
import MetricStateProvider from '@/providers/MetricStateProvider'
import { WalletProvider } from '@/providers/WalletProvider'
import { EditMode, SettingsSection } from '@/types/Dashboard'

import AvailabilityConfig from '../availabilities/AvailabilityConfig'
import Loading from '../Loading'
import QuickPoll from '../quickpoll/QuickPoll'
import RedirectHandler from '../redirect'
import Clientboard from './Clientboard'
import Contact from './Contact'
import { NavMenu } from './components/NavMenu'
import Group from './Group'
import MeetingSettings from './MeetingSettings'
import Meetings from './Meetings'
import Settings from './Settings'
import Wallet from './Wallet'

const DashboardContent: React.FC<{
  currentSection?: EditMode | string
}> = ({ currentSection }) => {
  const { currentAccount } = useContext(AccountContext)
  const [isOpened, setIsOpened] = useLocalStorage('SIDEBAR::OPENED', true)
  const settingsSections = new Set<SettingsSection>([
    SettingsSection.DETAILS,
    SettingsSection.CONNECTED_CALENDARS,
    SettingsSection.CONNECTED_ACCOUNTS,
    SettingsSection.NOTIFICATIONS,
    SettingsSection.SUBSCRIPTIONS,
    SettingsSection.WALLET_PAYMENT,
  ])
  const isSettings = currentSection
    ? settingsSections.has(currentSection as SettingsSection)
    : false

  // NavMenu only accepts EditMode; when in settings we hide NavMenu, so safe to pass undefined
  const navSection: EditMode | undefined = !isSettings
    ? (currentSection as EditMode | undefined)
    : undefined

  const renderSelected = () => {
    if (
      currentSection &&
      settingsSections.has(currentSection as SettingsSection)
    ) {
      return <Settings currentAccount={currentAccount!} />
    }
    switch (currentSection) {
      case EditMode.MEETINGS:
        return <Meetings currentAccount={currentAccount!} />
      case EditMode.GROUPS:
        return <Group currentAccount={currentAccount!} />
      case EditMode.CONTACTS:
        return <Contact currentAccount={currentAccount!} />
      case EditMode.AVAILABILITY:
        return <AvailabilityConfig currentAccount={currentAccount!} />
      case EditMode.MEETING_SETTINGS:
        return <MeetingSettings currentAccount={currentAccount!} />
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
        pr={isSettings ? 0 : { md: 8 }}
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
              currentSection={navSection}
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
