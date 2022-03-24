import { Box, Flex, HStack, useToast } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect } from 'react'

import { AccountContext } from '../../providers/AccountProvider'
import { EditMode } from '../../types/Dashboard'
import AvailabilityConfig from '../availabilities/availability-config'
import Loading from '../Loading'
import NotificationsConfig from '../notifications/NotificationConfig'
import AccountDetails from './AccountDetails'
import { NavMenu } from './components/NavMenu'
import ConnectCalendar from './ConnectCalendar'
import Meetings from './Meetings'
import MeetingTypesConfig from './MeetingTypesConfig'

const DashboardContent: React.FC<{ currentSection?: EditMode }> = ({
  currentSection,
}) => {
  const { currentAccount } = useContext(AccountContext)
  const router = useRouter()

  const toast = useToast()
  const { result } = router.query

  useEffect(() => {
    if (result === 'error') {
      toast({
        title: 'Error connecting calendar',
        description:
          'Please make sure to give access to Meet With Wallet within your calendar provider page.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    } else if (result === 'success') {
      toast({
        title: 'Calendar connected',
        description: "You've just connected a new calendar provider.",
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
  }, [])

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
    }
  }

  return currentAccount ? (
    <HStack alignItems="start" width="100%" flexWrap="wrap">
      <Box flex={4}>
        <NavMenu currentSection={currentSection} />
      </Box>
      <Box flex={8}>{renderSelected()}</Box>
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
