import { SlideFade, VStack } from '@chakra-ui/react'
import { Interval } from 'luxon'
import { type FC, memo } from 'react'

import { TimeSlot } from '@/types/Meeting'
import { ActiveAvailabilityBlock } from '@/types/schedule'

import { State } from './SchedulePickTime'
import ScheduleTimeSlot from './ScheduleTimeSlot'

interface ScheduleDateSectionProps {
  pickedTime: Date | null
  duration: number
  handleTimeSelection: (time: Date) => void
  timezone: string
  activeAvailabilityBlocks?: ActiveAvailabilityBlock[]
  currentAccountAddress?: string
  displayNameToAddress: Map<string, string>
  slots: Array<{
    slot: Interval<true>
    state: State
    userStates: Array<{
      state: boolean
      displayName: string
    }>
    slotKey: string
    currentUserEvent: TimeSlot | null
    eventUrl: string | null
  }>
}

const ScheduleDateSection: FC<ScheduleDateSectionProps> = ({
  displayNameToAddress,
  duration,
  handleTimeSelection,
  pickedTime,
  slots,
  timezone,
  activeAvailabilityBlocks,
  currentAccountAddress,
}) => {
  return (
    <SlideFade
      in={true}
      transition={{
        exit: { delay: 0 },
        enter: { duration: 0.1 },
      }}
      style={{
        flex: 1,
      }}
    >
      <VStack flex={1} align={'flex-start'} gap={2}>
        <VStack
          width="100%"
          align={'flex-start'}
          borderWidth={1}
          borderRadius={5}
          gap={'-1px'}
          bg="bg-canvas-subtle"
          p={1}
        >
          {slots.map(slotData => {
            return (
              <ScheduleTimeSlot
                key={slotData.slotKey}
                slotData={slotData}
                pickedTime={pickedTime}
                duration={duration}
                handleTimePick={handleTimeSelection}
                timezone={timezone}
                currentAccountAddress={currentAccountAddress}
                displayNameToAddress={displayNameToAddress}
                activeAvailabilityBlocks={activeAvailabilityBlocks}
              />
            )
          })}
        </VStack>
      </VStack>
    </SlideFade>
  )
}

export default memo(ScheduleDateSection)
