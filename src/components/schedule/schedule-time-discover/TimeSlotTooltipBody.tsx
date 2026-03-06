import { Interval } from 'luxon'
import React from 'react'
import { TimeSlot } from '@/types/Meeting'
import { ActiveAvailabilityBlock } from '@/types/schedule'
import { TimeSlotTooltipContent } from './TimeSlotTooltipContent'

interface TimeSlotTooltipBodyProps {
  userStates: Array<{ state: boolean; displayName: string }>
  displayNameToAddress: Map<string, string>
  currentAccountAddress?: string
  currentUserEvent?: TimeSlot | null
  eventUrl?: string | null
  activeAvailabilityBlocks?: ActiveAvailabilityBlock[]
  slot: Interval<true>
}

const TimeSlotTooltipBody: React.FC<TimeSlotTooltipBodyProps> = ({
  userStates,
  displayNameToAddress,
  currentAccountAddress,
  currentUserEvent,
  eventUrl,
  activeAvailabilityBlocks,
  slot,
}) => {
  // Separate current user from other participants
  const currentUserState = userStates?.find(userState => {
    const accountAddress = displayNameToAddress.get(userState.displayName)
    return accountAddress === currentAccountAddress?.toLowerCase()
  })

  const otherUserStates =
    userStates?.filter(userState => {
      const accountAddress = displayNameToAddress.get(userState.displayName)
      return accountAddress !== currentAccountAddress?.toLowerCase()
    }) || []

  return (
    <TimeSlotTooltipContent
      currentUserState={currentUserState}
      currentUserEvent={currentUserEvent}
      eventUrl={eventUrl}
      otherUserStates={otherUserStates}
      activeAvailabilityBlocks={activeAvailabilityBlocks}
      slot={slot}
    />
  )
}

export default React.memo(TimeSlotTooltipBody)
