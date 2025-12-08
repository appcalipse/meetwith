import { VStack } from '@chakra-ui/layout'
import * as React from 'react'

import CalendarPicker from './CalendarPicker'
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
    >
      <CalendarPicker />
      <ConnectedCalendar />
      <UpComingEvents />
    </VStack>
  )
}

export default Sidebar
