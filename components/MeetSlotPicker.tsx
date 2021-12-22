import React from 'react'
import DayTimePicker from './DayTimePicker'

interface MeetSlotPickerProps {
  onSchedule: (startTime: Date, content: string) => void
  timeSlotAvailability: (slot: Date) => boolean
  slotDurationInMinutes: number
  onDayChange?: (day: Date) => void
  onMonthChange?: (day: Date) => void
  willStartScheduling: (isScheduling: boolean) => void
  isSchedulingExternal: boolean
  reset: boolean
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({
  onSchedule,
  timeSlotAvailability,
  slotDurationInMinutes,
  onDayChange,
  onMonthChange,
  willStartScheduling,
  isSchedulingExternal,
  reset,
}) => {
  return (
    <DayTimePicker
      reset={reset}
      dayChanged={onDayChange}
      monthChanged={onMonthChange}
      timeSlotSizeMinutes={slotDurationInMinutes}
      onConfirm={onSchedule}
      willStartScheduling={willStartScheduling}
      isSchedulingExternal={isSchedulingExternal}
      timeSlotValidator={timeSlotAvailability}
    />
  )
}

export default MeetSlotPicker
