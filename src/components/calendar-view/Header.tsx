import { VStack } from '@chakra-ui/layout'
import type { FC } from 'react'

import MobileCalendarController from './MobileCalendarController'
import UpComingEvents from './UpcomingEvents'

const Header: FC = () => {
  return (
    <VStack w="100%" gap={5} pb={8}>
      <UpComingEvents isMobile />
      <MobileCalendarController />
    </VStack>
  )
}

export default Header
