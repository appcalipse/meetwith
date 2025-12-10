import { VStack } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { MeetingDecrypted } from '@/types/Meeting'

interface ActiveMeetwithEventProps {
  slot: MeetingDecrypted<DateTime<boolean>>
}

const ActiveMeetwithEvent: React.FC<ActiveMeetwithEventProps> = ({ slot }) => {
  const [activeSlot, setActiveSlot] =
    React.useState<MeetingDecrypted<DateTime>>(slot)
  const { selectedSlot, setSelectedSlot } = useCalendarContext()

  return <VStack></VStack>
}

export default ActiveMeetwithEvent
