import { VStack } from '@chakra-ui/layout'
import * as React from 'react'

import CalendarPicker from './CalendarPicker'
import ConnectCalendarButton from './ConnectCalendarButton'
import ConnectedCalendar from './ConnectedCalendar'
import UpComingEvents from './UpcomingEvents'

const Sidebar: React.FC = () => {
  return (
    <VStack
      minW={'300px'}
      h="100%"
      p={3}
      alignItems="start"
      justifyContent="flex-start"
      borderRightWidth={1}
      borderColor="menu-button-hover"
      bg="bg-event"
      roundedLeft={10}
    >
      <CalendarPicker />
      <ConnectedCalendar />
      <UpComingEvents />
      <ConnectCalendarButton />
    </VStack>
  )
}

export default Sidebar
