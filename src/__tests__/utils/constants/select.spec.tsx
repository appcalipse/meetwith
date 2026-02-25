import { timeZoneFilter, getCustomSelectComponents, getnoClearCustomSelectComponent, FilterOptionOption, TimeZoneOption } from '@utils/constants/select'

describe('timeZoneFilter', () => {
  const makeOption = (
    label: string,
    value: string,
    searchKeys: Array<{ id: string; name: string }> = [],
  ): FilterOptionOption<TimeZoneOption> => ({
    label,
    value,
    data: { label, value, searchKeys },
  })

  it('returns true when inputValue is empty', () => {
    const option = makeOption('America/New_York', 'America/New_York')
    expect(timeZoneFilter(option, '')).toBe(true)
  })

  it('returns true when label matches search', () => {
    const option = makeOption('(UTC-05:00) Eastern Time', 'America/New_York')
    expect(timeZoneFilter(option, 'Eastern')).toBe(true)
  })

  it('returns true when searchKey name matches', () => {
    const option = makeOption('(UTC-05:00) Eastern Time', 'America/New_York', [
      { id: 'America/New_York', name: 'New York' },
    ])
    expect(timeZoneFilter(option, 'New York')).toBe(true)
  })

  it('returns true when searchKey id matches', () => {
    const option = makeOption('(UTC-05:00) Eastern Time', 'America/New_York', [
      { id: 'America/New_York', name: 'New York' },
    ])
    expect(timeZoneFilter(option, 'America/New_York')).toBe(true)
  })

  it('returns false when nothing matches', () => {
    const option = makeOption('(UTC-05:00) Eastern Time', 'America/New_York', [
      { id: 'America/New_York', name: 'New York' },
    ])
    expect(timeZoneFilter(option, 'Pacific')).toBe(false)
  })

  it('performs case insensitive matching', () => {
    const option = makeOption('(UTC-05:00) Eastern Time', 'America/New_York', [
      { id: 'America/New_York', name: 'New York' },
    ])
    expect(timeZoneFilter(option, 'eastern')).toBe(true)
    expect(timeZoneFilter(option, 'EASTERN')).toBe(true)
    expect(timeZoneFilter(option, 'new york')).toBe(true)
  })

  it('handles option with no searchKeys gracefully', () => {
    const option: FilterOptionOption<TimeZoneOption> = {
      label: '(UTC-05:00) Eastern Time',
      value: 'America/New_York',
      data: { label: '(UTC-05:00) Eastern Time', value: 'America/New_York', searchKeys: undefined as unknown as Array<{ id: string; name: string }> },
    }
    expect(timeZoneFilter(option, 'Eastern')).toBe(true)
    expect(timeZoneFilter(option, 'zzz')).toBe(false)
  })
})

describe('getCustomSelectComponents', () => {
  it('returns object with ClearIndicator and DropdownIndicator keys', () => {
    const components = getCustomSelectComponents()
    expect(components).toHaveProperty('ClearIndicator')
    expect(components).toHaveProperty('DropdownIndicator')
    expect(typeof components!.ClearIndicator).toBe('function')
    expect(typeof components!.DropdownIndicator).toBe('function')
  })
})

describe('getnoClearCustomSelectComponent', () => {
  it('returns object with ClearIndicator and DropdownIndicator keys', () => {
    const components = getnoClearCustomSelectComponent()
    expect(components).toHaveProperty('ClearIndicator')
    expect(components).toHaveProperty('DropdownIndicator')
    expect(typeof components!.ClearIndicator).toBe('function')
    expect(typeof components!.DropdownIndicator).toBe('function')
  })
})
