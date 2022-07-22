import { TimeSlotSource } from '@/types/Meeting'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

const FULL_DAY_OUT = {
  start: new Date('2022-05-05 00:00:00.000Z'),
  end: new Date('2022-05-05 23:59:00.000Z'),
}

const EARLY_DAY_START = {
  start: new Date('2022-05-04 09:00:00.000Z'),
  end: new Date('2022-05-04 09:30:00.000Z'),
}

const account_1_address = '0x123'
const account_1_slots = [
  {
    start: new Date('2022-05-04 15:45:00.000Z'),
    end: new Date('2022-05-04 17:30:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_1_address,
  },
  {
    ...EARLY_DAY_START,
    source: TimeSlotSource.MWW,
    account_address: account_1_address,
  },
  {
    start: new Date('2022-05-05 09:00:00.000Z'),
    end: new Date('2022-05-05 09:30:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_1_address,
  },
  {
    start: new Date('2022-05-04 09:30:00.000Z'),
    end: new Date('2022-05-04 10:30:00.000Z'),
    source: TimeSlotSource.OFFICE,
    account_address: account_1_address,
  },
  {
    start: new Date('2022-05-05 11:00:00.000Z'),
    end: new Date('2022-05-05 11:30:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_1_address,
  },
  {
    start: new Date('2022-05-04 15:00:00.000Z'),
    end: new Date('2022-05-04 15:30:00.000Z'),
    source: TimeSlotSource.GOOGLE,
    account_address: account_1_address,
  },
  {
    start: new Date('2022-05-04 11:00:00.000Z'),
    end: new Date('2022-05-04 12:00:00.000Z'),
    source: TimeSlotSource.ICLOUD,
    account_address: account_1_address,
  },
]

const account_2_address = '0x345'
const account_2_slots = [
  {
    start: new Date('2022-05-04 09:00:00.000Z'),
    end: new Date('2022-05-04 10:00:00.000Z'),
    source: TimeSlotSource.WEBDAV,
    account_address: account_2_address,
  },
  {
    start: new Date('2022-05-04 10:00:00.000Z'),
    end: new Date('2022-05-04 11:00:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_2_address,
  },
  {
    start: new Date('2022-05-04 15:00:00.000Z'),
    end: new Date('2022-05-04 15:30:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_2_address,
  },
  {
    start: new Date('2022-05-05 09:00:00.000Z'),
    end: new Date('2022-05-05 09:30:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_2_address,
  },
]

const account_3_address = '0x678'
const account_3_slots = [
  {
    ...FULL_DAY_OUT,
    source: TimeSlotSource.MWW,
    account_address: account_3_address,
  }, //account 3 is out for the whole day on the 5th
  {
    ...EARLY_DAY_START,
    source: TimeSlotSource.MWW,
    account_address: account_3_address,
  },
  {
    start: new Date('2022-05-04 12:00:00.000Z'),
    end: new Date('2022-05-04 12:30:00.000Z'),
    source: TimeSlotSource.MWW,
    account_address: account_3_address,
  },
]

describe('Test mergeSlots function', () => {
  it('Merge a set of slots', () => {
    const merged = CalendarBackendHelper.mergeSlots([
      ...account_1_slots,
      ...account_2_slots,
      ...account_3_slots,
    ])

    expect(merged.length).toEqual(4)
    expect(merged[0].start).toEqual(EARLY_DAY_START.start)
    expect(merged[merged.length - 1].start).toEqual(FULL_DAY_OUT.start)
    expect(merged[merged.length - 1].end).toEqual(FULL_DAY_OUT.end)
  })
})
