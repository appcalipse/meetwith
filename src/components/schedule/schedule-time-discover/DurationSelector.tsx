import { Heading, HStack, Text, VStack } from '@chakra-ui/react'
import {
  ActionMeta,
  CreatableSelect as ChakraCreatableSelect,
  Select as ChakraSelect,
} from 'chakra-react-select'
import { useMemo, useState } from 'react'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { DurationMode } from '@/providers/schedule/ScheduleContext'
import { formatTime } from '@/utils/availability.helper'
import { allSlots, durationToHumanReadable } from '@/utils/calendar_manager'
import { DurationOptions } from '@/utils/constants/meeting-types'
import { DEFAULT_GROUP_SCHEDULING_DURATION } from '@/utils/constants/schedule'
import {
  customSelectComponents,
  noClearCustomSelectComponent,
  Option,
} from '@/utils/constants/select'
import {
  addMinutesToTime,
  compareTimes,
  durationToAddLabel,
  formatDurationCreateLabel,
  isValidDurationOption,
  parseDurationInput,
  subtractMinutesFromTime,
} from '@/utils/duration.helper'

const TIME_RANGE_VALUE = 'TIME_RANGE'

interface DurationSelectorProps {
  value: number | string | null
  durationMode: DurationMode
  timeRange: { startTime: string; endTime: string } | null
  onChange: (
    value: Option<number> | { value: string; label: string } | null
  ) => void
  onTimeRangeChange: (startTime: string, endTime: string) => void
  isDisabled?: boolean
}

const timeRangeSelectChakraStyles = {
  container: (provided: Record<string, unknown>) => ({
    ...provided,
    borderColor: 'input-border',
    bg: 'select-bg',
    width: { base: '100%', lg: '126px' },
  }),
  control: (provided: Record<string, unknown>) => ({
    ...provided,
    paddingLeft: 2,
    paddingRight: 2,
  }),
  valueContainer: (provided: Record<string, unknown>) => ({
    ...provided,
    padding: 0,
    paddingRight: 0,
    overflow: 'visible',
  }),
  singleValue: (provided: Record<string, unknown>) => ({
    ...provided,
    overflow: 'visible',
    textOverflow: 'clip',
    maxWidth: 'none',
  }),
  dropdownIndicator: (provided: Record<string, unknown>) => ({
    ...provided,
    paddingLeft: 0,
    paddingRight: 0,
  }),
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  value,
  timeRange,
  onChange,
  onTimeRangeChange,
  isDisabled = false,
}) => {
  // Convert DEFAULT_GROUP_SCHEDULING_DURATION to Option format
  const presetOptions: Option<number>[] = DEFAULT_GROUP_SCHEDULING_DURATION.map(
    type => ({
      value: type.duration,
      label: durationToHumanReadable(type.duration),
    })
  )

  const [options, setOptions] = useState<Option<number>[]>(
    DurationOptions.map(opt => ({
      ...opt,
      label: opt.label.replace('Mins', 'Minutes'),
    }))
  )

  // Combine preset options with custom options, removing duplicates
  const allDurationOptions = [
    ...presetOptions,
    ...options.filter(
      opt => !presetOptions.some(preset => preset.value === opt.value)
    ),
  ].sort((a, b) => a.value - b.value)

  // Add Custom Time Range option as the first option
  const allOptions: Array<Option<number> | { value: string; label: string }> = [
    {
      value: TIME_RANGE_VALUE,
      label: 'Custom time range',
    },
    ...allDurationOptions,
  ]

  const handleCreate = (inputValue: string) => {
    const total = parseDurationInput(inputValue)
    if (total === null) return
    const newOption: Option<number> = {
      value: total,
      label: durationToAddLabel(total),
    }
    setOptions(opts => {
      if (opts.some(o => o.value === total)) return opts
      return opts.concat(newOption)
    })
    onChange(newOption)
  }

  const handleSelectChange = (
    newValue: unknown,
    _actionMeta: ActionMeta<unknown>
  ) => {
    const value = newValue as
      | Option<number>
      | { value: string; label: string }
      | null

    if (!value) {
      onChange(null)
      return
    }

    // Check if Time Range was selected
    if (value.value === TIME_RANGE_VALUE) {
      onChange(value)
      // Initialize time range if not set
      if (!timeRange) {
        onTimeRangeChange('09:00', '10:00')
      }
    } else {
      // Regular duration option
      onChange(value as Option<number>)
    }
  }

  const isTimeRangeSelected = value === TIME_RANGE_VALUE

  const selectValue = isTimeRangeSelected
    ? { value: TIME_RANGE_VALUE, label: 'Custom time range' }
    : value !== null && typeof value === 'number'
    ? allDurationOptions.find(opt => opt.value === value) ?? {
        value: value,
        label: durationToAddLabel(value),
      }
    : null

  const timeOptions = useMemo(
    () =>
      allSlots.map(time => ({
        value: time,
        label: formatTime(time),
      })),
    []
  )

  const handleStartTimeChange = (
    opt: { value: string; label: string } | null
  ) => {
    if (!opt || !timeRange) return
    const end = timeRange.endTime
    let newStart = opt.value
    if (compareTimes(newStart, end) >= 0)
      newStart = subtractMinutesFromTime(end, 15)
    onTimeRangeChange(newStart, end)
  }

  const handleEndTimeChange = (
    opt: { value: string; label: string } | null
  ) => {
    if (!opt || !timeRange) return
    const newEnd = opt.value
    const start = timeRange.startTime
    if (compareTimes(newEnd, start) <= 0)
      onTimeRangeChange(start, addMinutesToTime(start, 15))
    else onTimeRangeChange(start, newEnd)
  }

  const startValue = useMemo(() => {
    if (!timeRange) return null
    return timeOptions.find(o => o.value === timeRange.startTime) ?? null
  }, [timeOptions, timeRange?.startTime])

  const endValue = useMemo(() => {
    if (!timeRange) return null
    return timeOptions.find(o => o.value === timeRange.endTime) ?? null
  }, [timeOptions, timeRange?.endTime])

  return (
    <>
      <VStack
        gap={2}
        alignItems={'flex-start'}
        width="fit-content"
        minW={'10px'}
      >
        <HStack width="fit-content" gap={0}>
          <Heading fontSize="16px">
            Duration
            <Text color="red.500" display="inline">
              {' '}
              *
            </Text>
          </Heading>
          <InfoTooltip text="How long the meeting will last. Choose a preset, type a custom duration (e.g. 90 or 2:55), or set a custom time range." />
        </HStack>
        <ChakraCreatableSelect
          value={selectValue}
          onChange={handleSelectChange}
          onCreateOption={handleCreate}
          formatCreateLabel={formatDurationCreateLabel}
          isValidNewOption={isValidDurationOption}
          options={allOptions}
          colorScheme="primary"
          className="noLeftBorder timezone-select"
          components={noClearCustomSelectComponent}
          chakraStyles={{
            container: provided => ({
              ...provided,
              borderColor: 'input-border',
              bg: 'select-bg',
              width: 'max-content',
              maxW: '350px',
            }),
          }}
          isDisabled={isDisabled}
          placeholder="Select or type (e.g. 90 or 2:55)..."
          noOptionsMessage={({ inputValue }) =>
            inputValue
              ? `Type minutes (e.g. 90) or H:MM (e.g. 2:55) to add`
              : 'No options'
          }
        />
      </VStack>
      {isTimeRangeSelected && timeRange && (
        <>
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width={{ base: '100%', lg: 'fit-content' }}
            minW={'10px'}
          >
            <HStack width="fit-content" gap={0}>
              <Heading fontSize="16px">Start time</Heading>
              <InfoTooltip text="Earliest time you're willing to meet within the selected range." />
            </HStack>
            <ChakraSelect
              value={startValue}
              onChange={v =>
                handleStartTimeChange(
                  v as { value: string; label: string } | null
                )
              }
              options={timeOptions}
              colorScheme="primary"
              className="noLeftBorder duration-time-select"
              components={customSelectComponents}
              chakraStyles={timeRangeSelectChakraStyles}
              isDisabled={isDisabled}
              placeholder="Start time"
            />
          </VStack>
          <VStack
            gap={2}
            alignItems={'flex-start'}
            width={{ base: '100%', lg: 'fit-content' }}
            minW={'10px'}
          >
            <HStack width="fit-content" gap={0}>
              <Heading fontSize="16px">End time</Heading>
              <InfoTooltip text="Latest time you're willing to meet within the selected range." />
            </HStack>
            <ChakraSelect
              value={endValue}
              onChange={v =>
                handleEndTimeChange(
                  v as { value: string; label: string } | null
                )
              }
              options={timeOptions}
              colorScheme="primary"
              className="noLeftBorder duration-time-select"
              components={customSelectComponents}
              chakraStyles={timeRangeSelectChakraStyles}
              isDisabled={isDisabled}
              placeholder="End time"
            />
          </VStack>
        </>
      )}
    </>
  )
}
