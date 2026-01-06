import {
  FormControl,
  FormHelperText,
  FormLabel,
  Select as ChakraSelect,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'

import { DurationMode } from '@/types/schedule'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { DEFAULT_GROUP_SCHEDULING_DURATION } from '@/utils/constants/schedule'

import CustomDurationInput from './CustomDurationInput'
import { DurationModeSelectorProps } from './DurationModeSelector.types'
import TimeRangePicker from './TimeRangePicker'

const DurationModeSelector: React.FC<DurationModeSelectorProps> = ({
  mode,
  duration,
  timeRange,
  onModeChange,
  onDurationChange,
  onTimeRangeChange,
  isDisabled,
}) => {
  // Generate display value for the main dropdown
  const displayValue = useMemo(() => {
    switch (mode) {
      case DurationMode.PRESET:
        return duration.toString()
      case DurationMode.CUSTOM:
        return DurationMode.CUSTOM
      case DurationMode.TIME_RANGE:
        return DurationMode.TIME_RANGE
      default:
        return duration.toString()
    }
  }, [mode, duration])

  // Handle main dropdown change
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value

    // Check if it's a preset duration value (numeric)
    const numericValue = Number(selectedValue)
    if (!isNaN(numericValue) && numericValue > 0) {
      // It's a preset duration
      onModeChange(DurationMode.PRESET)
      onDurationChange(numericValue)
    } else if (selectedValue === DurationMode.CUSTOM) {
      // Switch to custom mode
      onModeChange(DurationMode.CUSTOM)
      if (duration > 0) {
        onDurationChange(duration)
      } else {
        onDurationChange(60)
      }
    } else if (selectedValue === DurationMode.TIME_RANGE) {
      // Switch to time range mode
      onModeChange(DurationMode.TIME_RANGE)
      if (!timeRange) {
        onTimeRangeChange({
          startTime: '09:00',
          endTime: '17:00',
        })
      }
    }
  }

  const handleTimeRangeChange = (
    newTimeRange: { startTime: string; endTime: string } | null
  ) => {
    onTimeRangeChange(newTimeRange)

    if (newTimeRange) {
      // Calculate duration in minutes from time range
      const [startHours, startMinutes] = newTimeRange.startTime
        .split(':')
        .map(Number)
      const [endHours, endMinutes] = newTimeRange.endTime.split(':').map(Number)

      const startTotalMinutes = startHours * 60 + startMinutes
      const endTotalMinutes = endHours * 60 + endMinutes

      // Handle case where end time is next day (e.g., 23:00 - 02:00)
      const durationMinutes =
        endTotalMinutes >= startTotalMinutes
          ? endTotalMinutes - startTotalMinutes
          : 24 * 60 - startTotalMinutes + endTotalMinutes

      onDurationChange(durationMinutes)
    }
  }

  const getModeHelperText = () => {
    switch (mode) {
      case DurationMode.PRESET:
        return 'Standard meeting durations'
      case DurationMode.CUSTOM:
        return 'Enter any duration in minutes or hours (5-480 minutes)'
      case DurationMode.TIME_RANGE:
        return 'Find availability within a specific time window (00:00 AM - 11:45 PM)'
      default:
        return ''
    }
  }

  return (
    <VStack align="stretch" spacing={3} width="100%">
      <FormControl w={'fit-content'} isDisabled={isDisabled}>
        <FormLabel htmlFor="duration">
          Duration
          <Text color="red.500" display="inline">
            {' '}
            *
          </Text>
        </FormLabel>
        <ChakraSelect
          id="duration"
          placeholder="Duration"
          onChange={handleModeChange}
          value={displayValue}
          borderColor="input-border"
          width={'max-content'}
          maxW="350px"
          errorBorderColor="red.500"
          bg="select-bg"
          isDisabled={isDisabled}
        >
          {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
            <option key={type.id} value={type.duration}>
              {durationToHumanReadable(type.duration)}
            </option>
          ))}

          <option value={DurationMode.CUSTOM}>Custom duration</option>

          <option value={DurationMode.TIME_RANGE}>Time range</option>
        </ChakraSelect>
        {getModeHelperText() && (
          <FormHelperText color="neutral.400" mt={1} fontSize="sm">
            {getModeHelperText()}
          </FormHelperText>
        )}
      </FormControl>

      {/* Conditional rendering based on mode */}
      {mode === DurationMode.CUSTOM && (
        <CustomDurationInput
          value={duration}
          onChange={onDurationChange}
          isDisabled={isDisabled}
        />
      )}

      {mode === DurationMode.TIME_RANGE && timeRange && (
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
      )}
    </VStack>
  )
}

export default DurationModeSelector
