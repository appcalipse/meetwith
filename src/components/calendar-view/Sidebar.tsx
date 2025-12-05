import { VStack } from '@chakra-ui/layout'
import * as React from 'react'

import CalendarPicker from './CalendarPicker'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SidebarProps {}

const Sidebar: React.FC<SidebarProps> = ({}) => {
  return (
    <VStack
      minW={'300px'}
      h="100%"
      p={3}
      alignItems="start"
      justifyContent="flex-start"
    >
      <CalendarPicker />
    </VStack>
  )
}

export default Sidebar
