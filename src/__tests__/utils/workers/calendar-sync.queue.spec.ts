// Polyfill setImmediate for jsdom
if (typeof globalThis.setImmediate === 'undefined') {
  ;(globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args)
}

jest.mock('@/utils/sync_helper', () => ({
  ExternalCalendarSync: {
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    updateInstance: jest.fn().mockResolvedValue(undefined),
    deleteInstance: jest.fn().mockResolvedValue(undefined),
  },
}))

import { ExternalCalendarSync } from '@/utils/sync_helper'
import {
  queueCalendarUpdateSync,
  queueCalendarDeleteSync,
  queueCalendarInstanceUpdateSync,
} from '@/utils/workers/calendar-sync.queue'
import { ParticipationStatus } from '@/types/ParticipantInfo'

const mockUpdate = ExternalCalendarSync.update as jest.Mock
const mockDelete = ExternalCalendarSync.delete as jest.Mock
const mockUpdateInstance = ExternalCalendarSync.updateInstance as jest.Mock

describe('CalendarSyncQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const baseSyncRequest = {
    meeting: { id: 'meeting-1' } as any,
    participants: [],
    slot: {} as any,
    meetingType: {} as any,
    participantActing: {
      account_address: '0xABC',
      meeting_id: '',
      status: ParticipationStatus.Accepted,
      type: 'invitee' as const,
    },
    calendarLink: '',
    ownerAccountAddress: '0xABC',
    changeLink: '',
  }

  it('should enqueue and execute an update sync', async () => {
    mockUpdate.mockResolvedValue(undefined)

    await queueCalendarUpdateSync(baseSyncRequest as any)

    expect(mockUpdate).toHaveBeenCalledWith(baseSyncRequest)
  })

  it('should enqueue and execute a delete sync', async () => {
    mockDelete.mockResolvedValue(undefined)

    await queueCalendarDeleteSync(['0xABC'], ['event-1'])

    expect(mockDelete).toHaveBeenCalledWith('0xABC', ['event-1'])
  })

  it('should process multiple accounts concurrently', async () => {
    const executionOrder: string[] = []
    mockUpdate.mockImplementation(async (req: any) => {
      const addr = req.participantActing.account_address
      executionOrder.push(`start-${addr}`)
      await new Promise(resolve => setTimeout(resolve, 10))
      executionOrder.push(`end-${addr}`)
    })

    const req1 = {
      ...baseSyncRequest,
      participantActing: {
        ...baseSyncRequest.participantActing,
        account_address: '0x111',
      },
    }
    const req2 = {
      ...baseSyncRequest,
      participantActing: {
        ...baseSyncRequest.participantActing,
        account_address: '0x222',
      },
    }

    await Promise.all([
      queueCalendarUpdateSync(req1 as any),
      queueCalendarUpdateSync(req2 as any),
    ])

    // Both should have started before either finished (concurrent)
    expect(executionOrder).toContain('start-0x111')
    expect(executionOrder).toContain('start-0x222')
  })

  it('should process tasks for the same account serially', async () => {
    const executionOrder: number[] = []
    let callCount = 0

    mockUpdate.mockImplementation(async () => {
      const myIndex = ++callCount
      executionOrder.push(myIndex)
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    const req1 = { ...baseSyncRequest }
    const req2 = { ...baseSyncRequest }

    // Queue first, then the second will be queued while first is processing
    const p1 = queueCalendarUpdateSync(req1 as any)
    // Allow the first task to start processing
    await new Promise(resolve => setTimeout(resolve, 5))
    const p2 = queueCalendarUpdateSync(req2 as any)

    await Promise.all([p1, p2])

    expect(executionOrder[0]).toBe(1)
    expect(executionOrder[1]).toBe(2)
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  }, 10000)

  it('should enqueue and execute an instance update sync', async () => {
    mockUpdateInstance.mockResolvedValue(undefined)

    const instanceRequest = {
      ...baseSyncRequest,
      instance: { id: 'instance-1' },
    }

    await queueCalendarInstanceUpdateSync(instanceRequest as any)

    expect(mockUpdateInstance).toHaveBeenCalledWith(instanceRequest)
  })
})
