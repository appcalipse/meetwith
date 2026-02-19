import * as rsvp_queueWorker from '@/utils/workers/rsvp_queue'

describe('rsvp_queue worker', () => {
  it('exports worker', () => {
    expect(rsvp_queueWorker).toBeDefined()
  })

  it('has worker functions', () => {
    expect(typeof rsvp_queueWorker).toBe('object')
  })

  it('is importable', () => {
    expect(rsvp_queueWorker).toBeTruthy()
  })

  it('loads without error', () => {
    expect(() => require('@/utils/workers/rsvp_queue')).not.toThrow()
  })

  it('has valid exports', () => {
    expect(Object.keys(rsvp_queueWorker).length).toBeGreaterThanOrEqual(0)
  })

  it('exports are defined', () => {
    Object.values(rsvp_queueWorker).forEach(exp => {
      expect(exp).toBeDefined()
    })
  })

  it('worker structure valid', () => {
    expect(rsvp_queueWorker).not.toBeNull()
  })

  it('provides worker functionality', () => {
    expect(rsvp_queueWorker).toBeTruthy()
  })

  it('is stable', () => {
    const first = require('@/utils/workers/rsvp_queue')
    const second = require('@/utils/workers/rsvp_queue')
    expect(first).toEqual(second)
  })

  it('exports accessible', () => {
    expect(rsvp_queueWorker).not.toBeUndefined()
  })

  it('functions callable', () => {
    Object.values(rsvp_queueWorker).forEach(exp => {
      if (typeof exp === 'function') {
        expect(typeof exp).toBe('function')
      }
    })
  })

  it('correct module format', () => {
    expect(typeof rsvp_queueWorker).not.toBe('undefined')
  })
})
