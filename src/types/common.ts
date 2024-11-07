import { TimeRange } from './Account'

export enum ConditionRelation {
  AND = 'and',
  OR = 'or',
}
export interface SuccessResponse {
  success: boolean
}

export interface CustomTimeRange extends TimeRange {
  timezone: string
  weekday: number
}

export interface CustomDayAvailability {
  weekday: number
  ranges: CustomTimeRange[]
}
