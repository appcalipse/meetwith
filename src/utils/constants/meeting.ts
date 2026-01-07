export const MEETING_PAGE_SIZE = 5

export enum UpdateMode {
  ALL_EVENTS = 'all_events',
  SINGLE_EVENT = 'single_event',
}

export const updateModes = [
  {
    label: 'All events',
    value: UpdateMode.ALL_EVENTS,
  },
  {
    label: 'This event',
    value: UpdateMode.SINGLE_EVENT,
  },
]
