import { VStack } from '@chakra-ui/react'
import React from 'react'

import { DurationMode } from '@/types/schedule'

import CustomDurationInput from './CustomDurationInput'
import { DurationModeSelectorProps } from './DurationModeSelector.types'
import TimeRangePicker from './TimeRangePicker'

export const DurationModeInputs: React.FC<DurationModeSelectorProps> = ({
  mode,
  duration,
  timeRange,
  onDurationChange,
  onTimeRangeChange,
  isDisabled,
}) => {
  const handleTimeRangeChange = (
    newTimeRange: { startTime: string; endTime: string } | null
  ) => {
    onTimeRangeChange(newTimeRange)

    if (newTimeRange) {
      const [startHours, startMinutes] = newTimeRange.startTime
        .split(':')
        .map(Number)
      const [endHours, endMinutes] = newTimeRange.endTime.split(':').map(Number)

      const startTotalMinutes = startHours * 60 + startMinutes
      const endTotalMinutes = endHours * 60 + endMinutes

      const durationMinutes =
        endTotalMinutes >= startTotalMinutes
          ? endTotalMinutes - startTotalMinutes
          : 24 * 60 - startTotalMinutes + endTotalMinutes

      onDurationChange(durationMinutes)
    }
  }

  if (mode === DurationMode.CUSTOM) {
    return (
      <CustomDurationInput
        value={duration}
        onChange={onDurationChange}
        isDisabled={isDisabled}
      />
    )
  }

  if (mode === DurationMode.TIME_RANGE && timeRange) {
    return (
      <TimeRangePicker
        startTime={timeRange.startTime}
        endTime={timeRange.endTime}
        onStartTimeChange={startTime =>
          handleTimeRangeChange({ ...timeRange, startTime })
        }
        onEndTimeChange={endTime =>
          handleTimeRangeChange({ ...timeRange, endTime })
        }
        isDisabled={isDisabled}
      />
    )
  }

  return null
}
