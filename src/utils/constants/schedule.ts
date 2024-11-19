import { MeetingReminders } from '@/types/common'

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
