import { DateTime } from 'luxon'
import * as React from 'react'
import { UnifiedEvent } from '@/types/Calendar'

interface ActiveCalendarEventProps {
  slot: UnifiedEvent<DateTime>
}

const ActiveCalendarEvent: React.FC<ActiveCalendarEventProps> = ({ slot }) => {
  return <div></div>
}

export default ActiveCalendarEvent
