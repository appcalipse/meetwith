import { DateObj } from 'dayzed'

// based on https://github.com/aboveyunhai/chakra-dayzed-datepicker
export * from './range'
export * from './single'

export type OnDateSelected = (
  selectedDate: DateObj,
  event: React.SyntheticEvent<Element, Event>
) => void
