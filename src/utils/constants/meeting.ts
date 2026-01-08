export const MEETING_PAGE_SIZE = 5

export enum UpdateMode {
  ALL_EVENTS = 'all_events',
  SINGLE_EVENT = 'single_event',
}

export const updateModes = [
  {
    label: 'This event',
    value: UpdateMode.SINGLE_EVENT,
  },
  {
    label: 'All events',
    value: UpdateMode.ALL_EVENTS,
  },
]

export enum MeetingAction {
  SCHEDULE_MEETING = 'schedule_meeting',
  CANCEL_MEETING = 'cancel_meeting',
  DELETE_MEETING = 'delete_meeting',
}
