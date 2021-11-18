import React from 'react';
import DayTimePicker from '@mooncake-dev/react-day-time-picker';

interface MeetSlotPickerProps {
    onSchedule: (startTime: Date) => void;
}

const MeetSlotPicker: React.FC<MeetSlotPickerProps> = ({ onSchedule }) => {
    return <DayTimePicker timeSlotSizeMinutes={15} onConfirm={onSchedule} />;
}

export default MeetSlotPicker;