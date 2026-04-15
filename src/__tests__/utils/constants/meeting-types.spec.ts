import {
  SessionType,
  isSessionType,
  PlanType,
  isPlanType,
  PaymentChannel,
  isPaymentChannel,
  PaymentChannelOptions,
  getDefaultValues,
  supportedPaymentChains,
  networkOptions,
} from '@utils/constants/meeting-types'

describe('isSessionType', () => {
  it('returns true for valid session types', () => {
    expect(isSessionType('paid')).toBe(true)
    expect(isSessionType('free')).toBe(true)
  })

  it('returns false for invalid session types', () => {
    expect(isSessionType('premium')).toBe(false)
    expect(isSessionType('')).toBe(false)
    expect(isSessionType('FREE')).toBe(false)
  })
})

describe('isPlanType', () => {
  it('returns true for valid plan types', () => {
    expect(isPlanType('one_off')).toBe(true)
    expect(isPlanType('sessions')).toBe(true)
  })

  it('returns false for invalid plan types', () => {
    expect(isPlanType('monthly')).toBe(false)
    expect(isPlanType('')).toBe(false)
    expect(isPlanType('ONE_OFF')).toBe(false)
  })
})

describe('isPaymentChannel', () => {
  it('returns true for valid payment channels', () => {
    expect(isPaymentChannel('account_address')).toBe(true)
    expect(isPaymentChannel('custom_address')).toBe(true)
  })

  it('returns false for invalid payment channels', () => {
    expect(isPaymentChannel('bank')).toBe(false)
    expect(isPaymentChannel('')).toBe(false)
  })
})

describe('PaymentChannelOptions', () => {
  const address = '0x1234abcd'
  const options = PaymentChannelOptions(address)

  it('returns an array of 2 options', () => {
    expect(options).toHaveLength(2)
  })

  it('includes the address in the first option label', () => {
    expect(options[0].label).toContain(address)
  })

  it('has correct values', () => {
    expect(options[0].value).toBe(PaymentChannel.ACCOUNT_ADDRESS)
    expect(options[1].value).toBe(PaymentChannel.CUSTOM_ADDRESS)
  })
})

describe('getDefaultValues', () => {
  const defaults = getDefaultValues()

  it('returns object with expected keys', () => {
    expect(defaults).toHaveProperty('availabilities')
    expect(defaults).toHaveProperty('calendars')
    expect(defaults).toHaveProperty('description')
    expect(defaults).toHaveProperty('duration_minutes')
    expect(defaults).toHaveProperty('min_notice_minutes')
    expect(defaults).toHaveProperty('plan')
    expect(defaults).toHaveProperty('slug')
    expect(defaults).toHaveProperty('title')
    expect(defaults).toHaveProperty('type')
  })

  it('has duration_minutes of 30', () => {
    expect(defaults.duration_minutes).toBe(30)
  })

  it('has type FREE', () => {
    expect(defaults.type).toBe(SessionType.FREE)
  })

  it('has correct plan defaults', () => {
    expect(defaults.plan).toBeDefined()
    expect(defaults.plan!.no_of_slot).toBe(1)
    expect(defaults.plan!.type).toBe(PlanType.ONE_OFF)
    expect(defaults.plan!.payment_channel).toBe(PaymentChannel.ACCOUNT_ADDRESS)
  })
})

describe('supportedPaymentChains', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(supportedPaymentChains)).toBe(true)
    expect(supportedPaymentChains.length).toBeGreaterThan(0)
  })
})

describe('networkOptions', () => {
  it('is an array', () => {
    expect(Array.isArray(networkOptions)).toBe(true)
  })

  it('each entry has icon, id, name, value properties', () => {
    for (const option of networkOptions) {
      expect(option).toHaveProperty('icon')
      expect(option).toHaveProperty('id')
      expect(option).toHaveProperty('name')
      expect(option).toHaveProperty('value')
    }
  })
})
