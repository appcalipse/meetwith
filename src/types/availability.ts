import { UseMutationResult } from '@tanstack/react-query'

import { TimeRange } from './Account'

export interface AvailabilityBlock {
  id: string
  title: string
  timezone: string
  isDefault: boolean
  weekly_availability: Array<{
    weekday: number
    ranges: TimeRange[]
  }>
}

export interface UseAvailabilityBlocksResult {
  blocks: AvailabilityBlock[] | undefined
  isLoading: boolean
  isFetching: boolean
  createBlock: UseMutationResult<
    AvailabilityBlock,
    unknown,
    {
      title: string
      timezone: string
      weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
      is_default?: boolean
    }
  >
  updateBlock: UseMutationResult<
    AvailabilityBlock,
    unknown,
    {
      id: string
      title: string
      timezone: string
      weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
      is_default?: boolean
    }
  >
  deleteBlock: UseMutationResult<void, unknown, string>
  duplicateBlock: UseMutationResult<
    AvailabilityBlock,
    unknown,
    {
      id: string
      modifiedData: {
        title: string
        timezone: string
        weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
        is_default: boolean
      }
    }
  >
}
