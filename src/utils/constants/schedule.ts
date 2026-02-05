import { v4 } from 'uuid'

import { MeetingReminders } from '@/types/common'
import { MeetingRepeat } from '@/types/Meeting'
export const MeetingNotificationOptions = [
  {
    label: '5 minutes before',
    value: MeetingReminders['5_MINUTES_BEFORE'],
  },
  {
    label: '10 minutes before',
    value: MeetingReminders['10_MINUTES_BEFORE'],
  },
  {
    label: '15 minutes before',
    value: MeetingReminders['15_MINUTES_BEFORE'],
  },
  {
    label: '30 minutes before',
    value: MeetingReminders['30_MINUTES_BEFORE'],
  },
  {
    label: '1 hour before',
    value: MeetingReminders['1_HOUR_BEFORE'],
  },
  {
    label: '1 day before',
    value: MeetingReminders['1_DAY_BEFORE'],
  },
  {
    label: '1 week before',
    value: MeetingReminders['1_WEEK_BEFORE'],
  },
]

export const MeetingRepeatOptions = [
  {
    label: 'Does not repeat',
    value: MeetingRepeat['NO_REPEAT'],
  },
  {
    label: 'Daily',
    value: MeetingRepeat['DAILY'],
  },
  {
    label: 'Weekly',
    value: MeetingRepeat['WEEKLY'],
  },
  {
    label: 'Monthly',
    value: MeetingRepeat['MONTHLY'],
  },
]

export const MeetingRepeatIntervals = [
  {
    interval: 5,
    label: '5 minutes',
    value: MeetingReminders['5_MINUTES_BEFORE'],
  },
  {
    interval: 10,
    label: '10 minutes',
    value: MeetingReminders['10_MINUTES_BEFORE'],
  },
  {
    interval: 15,
    label: '15 minutes',
    value: MeetingReminders['15_MINUTES_BEFORE'],
  },
  {
    interval: 30,
    label: '30 minutes',
    value: MeetingReminders['30_MINUTES_BEFORE'],
  },
  {
    interval: 60,
    label: '1 hour',
    value: MeetingReminders['1_HOUR_BEFORE'],
  },
  {
    interval: 1440,
    label: '1 day',
    value: MeetingReminders['1_DAY_BEFORE'],
  },
  {
    interval: 10080,
    label: '1 week',
    value: MeetingReminders['1_WEEK_BEFORE'],
  },
]

const generateGroupSchedulingDurations = () => [
  { duration: 15, id: v4() },
  { duration: 30, id: v4() },
  { duration: 45, id: v4() },
  { duration: 60, id: v4() },
  { duration: 90, id: v4() },
  { duration: 120, id: v4() },
  { duration: 150, id: v4() },
  { duration: 180, id: v4() },
]

export const DEFAULT_GROUP_SCHEDULING_DURATION =
  generateGroupSchedulingDurations()

export enum MeetingPermissions {
  SEE_GUEST_LIST = 'see_guest_list',
  INVITE_GUESTS = 'invite_guests',
  EDIT_MEETING = 'edit_meeting',
  SCHEDULE_MEETING = 'schedule_meeting',
}

export enum QuickPollPermissions {
  VIEW_GUESTS = 'view_guests',
  SCHEDULE_MEETING = 'schedule_meeting',
  ADD_PARTICIPANTS = 'add_participants',
}

export const MeetingSchedulePermissions = [
  {
    label: 'Permission to see other guests',
    value: MeetingPermissions.SEE_GUEST_LIST,
  },
  {
    label: 'Permission to invite other guests',
    value: MeetingPermissions.INVITE_GUESTS,
  },
  {
    info: 'Guests will be able to modify the meeting title, description, location, and other details, but not the invitees.',
    label: 'Permission to edit the meeting',
    value: MeetingPermissions.EDIT_MEETING,
  },
]

export const QuickPollPermissionsList: Array<{
  label: string
  value: MeetingPermissions
  info?: string
}> = [
  {
    label: 'Guest can schedule',
    value: MeetingPermissions.SCHEDULE_MEETING,
  },
  {
    label: 'Guest can see guest list',
    value: MeetingPermissions.SEE_GUEST_LIST,
  },
  {
    label: 'Guest can add other participants',
    value: MeetingPermissions.INVITE_GUESTS,
  },
]

export enum CalendarType {
  REGULAR,
  TEAM,
}
