import React from 'react';
import DayTimePicker from './DayTimePicker';

interface MeetSlotPickerProps {
  onSchedule: (startTime: Date) => void;
  timeSlotAvailability: (slot: Date) => boolean;
  slotDurationInMinutes: number;
  onDayChange?: (day: Date) => void;
  onMonthChange?: (day: Date) => void;
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({
  onSchedule,
  timeSlotAvailability,
  slotDurationInMinutes,
  onDayChange,
  onMonthChange,
}) => {
  return (
    <DayTimePicker
      dayChanged={onDayChange}
      monthChanged={onMonthChange}
      timeSlotSizeMinutes={slotDurationInMinutes}
      onConfirm={onSchedule}
      timeSlotValidator={timeSlotAvailability}
    />
  );
};

export default MeetSlotPicker;
