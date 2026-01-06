import { DurationMode, TimeRangeFilter } from '@/types/schedule'

export interface CustomDurationInputProps {
  value: number
  onChange: (totalMinutes: number) => void
  isInvalid?: boolean
  errorMessage?: string
  onBlur?: () => void
  isDisabled?: boolean
}

export interface TimeRangePickerProps {
  startTime: string
  endTime: string
  onStartTimeChange: (startTime: string) => void
  onEndTimeChange: (endTime: string) => void
  timezone: string
  isInvalid?: boolean
  errorMessage?: string
  isDisabled?: boolean
}

export interface DurationModeSelectorProps {
  mode: DurationMode
  duration: number
  timeRange: TimeRangeFilter | null
  onModeChange: (mode: DurationMode) => void
  onDurationChange: (duration: number) => void
  onTimeRangeChange: (timeRange: TimeRangeFilter | null) => void
  timezone: string
  isDisabled?: boolean
}
