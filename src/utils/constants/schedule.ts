import { v4 } from 'uuid'

import { MeetingReminders } from '@/types/common'
import { MeetingRepeat } from '@/types/Meeting'
export const MeetingNotificationOptions = [
  {
    value: MeetingReminders['5_MINUTES_BEFORE'],
    label: '5 minutes before',
  },
  {
    value: MeetingReminders['10_MINUTES_BEFORE'],
    label: '10 minutes before',
  },
  {
    value: MeetingReminders['15_MINUTES_BEFORE'],
    label: '15 minutes before',
  },
  {
    value: MeetingReminders['30_MINUTES_BEFORE'],
    label: '30 minutes before',
  },
  {
    value: MeetingReminders['1_HOUR_BEFORE'],
    label: '1 hour before',
  },
  {
    value: MeetingReminders['1_DAY_BEFORE'],
    label: '1 day before',
  },
  {
    value: MeetingReminders['1_WEEK_BEFORE'],
    label: '1 week before',
  },
]

export const MeetingRepeatOptions = [
  {
    value: MeetingRepeat['NO_REPEAT'],
    label: 'Does not repeat',
  },
  {
    value: MeetingRepeat['DAILY'],
    label: 'Daily',
  },
  {
    value: MeetingRepeat['WEEKLY'],
    label: 'Weekly',
  },
  {
    value: MeetingRepeat['MONTHLY'],
    label: 'Monthly',
  },
]

export const MeetingRepeatIntervals = [
  {
    value: MeetingReminders['5_MINUTES_BEFORE'],
    interval: 5,
    label: '5 minutes',
  },
  {
    value: MeetingReminders['10_MINUTES_BEFORE'],
    interval: 10,
    label: '10 minutes',
  },
  {
    value: MeetingReminders['15_MINUTES_BEFORE'],
    interval: 15,
    label: '15 minutes',
  },
  {
    value: MeetingReminders['30_MINUTES_BEFORE'],
    interval: 30,
    label: '30 minutes',
  },
  {
    value: MeetingReminders['1_HOUR_BEFORE'],
    interval: 60,
    label: '1 hour',
  },
  {
    value: MeetingReminders['1_DAY_BEFORE'],
    interval: 1440,
    label: '1 day',
  },
  {
    value: MeetingReminders['1_WEEK_BEFORE'],
    interval: 10080,
    label: '1 week',
  },
]

const generateGroupSchedulingDurations = () => [
  { id: v4(), duration: 15 },
  { id: v4(), duration: 30 },
  { id: v4(), duration: 45 },
  { id: v4(), duration: 60 },
  { id: v4(), duration: 90 },
  { id: v4(), duration: 120 },
  { id: v4(), duration: 150 },
  { id: v4(), duration: 180 },
]

export const DEFAULT_GROUP_SCHEDULING_DURATION =
  generateGroupSchedulingDurations()

export enum MeetingPermissions {
  SEE_GUEST_LIST = 'see_guest_list',
  INVITE_GUESTS = 'invite_guests',
}

export const MeetingSchedulePermissions = [
  {
    value: MeetingPermissions.SEE_GUEST_LIST,
    label: 'Permission to see other guests',
  },
  {
    value: MeetingPermissions.INVITE_GUESTS,
    label: 'Permission to invite other guests',
  },
]
