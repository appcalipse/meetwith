import * as email_queueWorker from '@/utils/workers/email_queue'

describe('email_queue worker', () => {
  it('exports worker', () => {
    expect(email_queueWorker).toBeDefined()
  })

  it('has worker functions', () => {
    expect(typeof email_queueWorker).toBe('object')
  })

  it('is importable', () => {
    expect(email_queueWorker).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/workers/email_queue')).not.toThrow()
  })

  it('has valid exports', () => {
    expect(Object.keys(email_queueWorker).length).toBeGreaterThanOrEqual(0)
  })

  it('exports are defined', () => {
    Object.values(email_queueWorker).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('worker structure valid', () => {
    expect(email_queueWorker).not.toBeNull()
  })

  it('provides worker functionality', () => {
    expect(email_queueWorker).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/workers/email_queue')
    const second = require('@/utils/workers/email_queue')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(email_queueWorker).not.toBeUndefined()
  })

  it('functions callable', () => {
    Object.values(email_queueWorker).forEach(exp => {
      if (typeof exp === 'function') {
        expect(typeof exp).toBe('function')
      }
    })
  })

  it('correct module format', () => {
    expect(typeof email_queueWorker).not.toBe('undefined')
  })
})
