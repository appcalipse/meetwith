import React from 'react'
import DayTimePicker from './DayTimePicker'

interface MeetSlotPickerProps {
  onSchedule: (startTime: Date, content: string) => void
  timeSlotAvailability: (slot: Date) => boolean
  slotDurationInMinutes: number
  onDayChange?: (day: Date) => void
  onMonthChange?: (day: Date) => void
  isScheduling: (isScheduling: boolean) => void
  reset: boolean
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({
  onSchedule,
  timeSlotAvailability,
  slotDurationInMinutes,
  onDayChange,
  onMonthChange,
  isScheduling,
  reset,
}) => {
  return (
    <DayTimePicker
      reset={reset}
      dayChanged={onDayChange}
      monthChanged={onMonthChange}
      timeSlotSizeMinutes={slotDurationInMinutes}
      onConfirm={onSchedule}
      willStartScheduling={isScheduling}
      timeSlotValidator={timeSlotAvailability}
    />
  )
}

export default MeetSlotPicker
