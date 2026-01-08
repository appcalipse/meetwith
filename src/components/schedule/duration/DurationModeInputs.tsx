import React from 'react'

import { DurationMode } from '@/types/schedule'
import { calculateDurationFromTimeRange } from '@/utils/duration.helper'

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
      onDurationChange(
        calculateDurationFromTimeRange(
          newTimeRange.startTime,
          newTimeRange.endTime
        )
      )
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
