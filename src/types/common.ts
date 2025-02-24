import { TimeRange } from './Account'

export enum ConditionRelation {
  AND = 'and',
  OR = 'or',
}
export interface SuccessResponse {
  success: boolean
}

export interface CustomTimeRange extends TimeRange {
  timezone?: string
  weekday: number
}

export interface CustomDayAvailability {
  weekday: number
  ranges: CustomTimeRange[]
}

export enum MeetingReminders {
  '5_MINUTES_BEFORE',
  '10_MINUTES_BEFORE',
  '15_MINUTES_BEFORE',
  '30_MINUTES_BEFORE',
  '1_HOUR_BEFORE',
  '1_DAY_BEFORE',
  '1_WEEK_BEFORE',
}
