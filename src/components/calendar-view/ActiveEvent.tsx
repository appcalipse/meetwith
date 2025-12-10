import { Drawer, DrawerBody, DrawerContent } from '@chakra-ui/react'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { isCalendarEvent } from '@/types/Calendar'

import ActiveCalendarEvent from './ActiveCalendarEvent'
import ActiveMeetwithEvent from './ActiveMeetwithEvent'

const ActiveEvent: React.FC = ({}) => {
  const { selectedSlot, setSelectedSlot } = useCalendarContext()
  return (
    <Drawer
      isOpen={!!selectedSlot}
      placement="right"
      onClose={() => setSelectedSlot(null)}
    >
      <DrawerContent>
        <DrawerBody>
          {selectedSlot &&
            (isCalendarEvent(selectedSlot) ? (
              <ActiveCalendarEvent slot={selectedSlot} />
            ) : (
              <ActiveMeetwithEvent slot={selectedSlot} />
            ))}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}

export default ActiveEvent
