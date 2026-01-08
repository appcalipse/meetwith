import {
  FormControl,
  FormLabel,
  HStack,
  Select as ChakraSelect,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'

import InfoTooltip from '@/components/profile/components/Tooltip'
import { DurationMode } from '@/types/schedule'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { DEFAULT_GROUP_SCHEDULING_DURATION } from '@/utils/constants/schedule'

import { DurationModeSelectorProps } from './DurationModeSelector.types'

const DurationModeSelector: React.FC<DurationModeSelectorProps> = ({
  mode,
  duration,
  onModeChange,
  onDurationChange,
  onTimeRangeChange,
  isDisabled,
}) => {
  // Check if current duration matches a preset
  const currentPresetDuration = useMemo(() => {
    const preset = DEFAULT_GROUP_SCHEDULING_DURATION.find(
      p => p.duration === duration
    )
    return preset ? preset.duration : null
  }, [duration])

  const getDurationTooltipText = () => {
    switch (mode) {
      case DurationMode.PRESET:
        return 'Select from standard meeting durations (15, 30, 45, 60, 90, 120, 150, or 180 minutes).'
      case DurationMode.CUSTOM:
        return 'Enter any custom duration between 5-480 minutes. Supports formats like "90", "1h 30m", or "2:30".'
      case DurationMode.TIME_RANGE:
        return 'Select a time window (start and end time) to find availability within that range. The meeting duration will equal the selected time range.'
      default:
        return ''
    }
  }

  // Handle mode dropdown change
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMode = e.target.value as DurationMode

    if (selectedMode === DurationMode.CUSTOM) {
      // Switch to custom mode
      onModeChange(DurationMode.CUSTOM)
      onTimeRangeChange(null)
      onDurationChange(60)
    } else if (selectedMode === DurationMode.TIME_RANGE) {
      // Switch to time range mode
      onModeChange(DurationMode.TIME_RANGE)
      const defaultTimeRange = {
        startTime: '09:00',
        endTime: '17:00',
      }
      onTimeRangeChange(defaultTimeRange)
      // Calculate duration from default time range
      const [startHours, startMinutes] = defaultTimeRange.startTime
        .split(':')
        .map(Number)
      const [endHours, endMinutes] = defaultTimeRange.endTime
        .split(':')
        .map(Number)
      const startTotalMinutes = startHours * 60 + startMinutes
      const endTotalMinutes = endHours * 60 + endMinutes
      const durationMinutes = endTotalMinutes - startTotalMinutes
      onDurationChange(durationMinutes)
    } else if (selectedMode === DurationMode.PRESET) {
      // Switch to preset mode
      onModeChange(DurationMode.PRESET)
      onTimeRangeChange(null)
      onDurationChange(30)
    }
  }

  // Handle preset duration dropdown change
  const handlePresetDurationChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedDuration = Number(e.target.value)
    if (!isNaN(selectedDuration) && selectedDuration > 0) {
      onDurationChange(selectedDuration)
    }
  }

  return (
    <>
      <VStack
        gap={2}
        alignItems={'flex-start'}
        width="fit-content"
        minW={'10px'}
      >
        <FormControl w={'fit-content'} isDisabled={isDisabled}>
          <FormLabel htmlFor="duration-mode">Mode</FormLabel>
          <ChakraSelect
            id="duration-mode"
            placeholder="Select mode"
            onChange={handleModeChange}
            value={mode}
            borderColor="input-border"
            width={'max-content'}
            maxW="200px"
            errorBorderColor="red.500"
            bg="select-bg"
            isDisabled={isDisabled}
          >
            <option value={DurationMode.PRESET}>Preset</option>
            <option value={DurationMode.CUSTOM}>Custom duration</option>
            <option value={DurationMode.TIME_RANGE}>Time range</option>
          </ChakraSelect>
        </FormControl>
      </VStack>

      {/* Show preset duration dropdown when in PRESET mode */}
      {mode === DurationMode.PRESET && (
        <VStack
          gap={2}
          alignItems={'flex-start'}
          width="fit-content"
          minW={'10px'}
        >
          <FormControl w={'fit-content'} isDisabled={isDisabled}>
            <HStack width="fit-content" gap={0}>
              <FormLabel htmlFor="preset-duration" mb={0} mr={0}>
                Duration
              </FormLabel>
              <InfoTooltip text={getDurationTooltipText()} ml={1} />
            </HStack>
            <ChakraSelect
              id="preset-duration"
              placeholder="Select duration"
              onChange={handlePresetDurationChange}
              value={currentPresetDuration || duration}
              borderColor="input-border"
              width={'max-content'}
              maxW="200px"
              errorBorderColor="red.500"
              bg="select-bg"
              isDisabled={isDisabled}
            >
              {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
                <option key={type.id} value={type.duration}>
                  {durationToHumanReadable(type.duration)}
                </option>
              ))}
            </ChakraSelect>
          </FormControl>
        </VStack>
      )}
    </>
  )
}

export default DurationModeSelector
