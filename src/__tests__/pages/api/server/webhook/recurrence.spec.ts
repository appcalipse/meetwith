/**
 * Unit tests for /api/server/webhook/recurrence endpoint
 * Testing recurrence sync webhook functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  syncAllSeries: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/webhook/recurrence'
import * as database from '@/utils/database'

describe('/api/server/webhook/recurrence', () => {
  const mockSyncAllSeries = database.syncAllSeries as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock
  let consoleDebugSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
    }

    res = {
      status: statusMock,
    }

    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleDebugSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('POST /api/server/webhook/recurrence', () => {
    it('should sync series successfully', async () => {
      mockSyncAllSeries.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSyncAllSeries).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Recurrence sync completed',
          success: true,
          partial_failure: false,
        })
      )
    })

    it('should include job_id and elapsed_ms in response', async () => {
      mockSyncAllSeries.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response).toHaveProperty('job_id')
      expect(response).toHaveProperty('elapsed_ms')
      expect(response.job_id).toMatch(/^recurrence-\d+$/)
      expect(typeof response.elapsed_ms).toBe('number')
    })

    it('should handle timeout and return 202', async () => {
      jest.useFakeTimers()
      mockSyncAllSeries.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 30000))
      )

      const handlerPromise = handler(req as NextApiRequest, res as NextApiResponse)
      jest.advanceTimersByTime(25000)
      await handlerPromise

      expect(statusMock).toHaveBeenCalledWith(202)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Recurrence sync started (processing in background)',
          status: 'processing',
          success: true,
        })
      )

      jest.useRealTimers()
    })

    it('should handle partial failures', async () => {
      mockSyncAllSeries.mockRejectedValue(new Error('Sync failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          partial_failure: true,
        })
      )
    })

    it('should log debug information', async () => {
      mockSyncAllSeries.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[RecurrenceSync] Starting',
        expect.any(Object)
      )
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[RecurrenceSync] Completed',
        expect.any(Object)
      )
    })

    it('should log errors when sync fails', async () => {
      const error = new Error('Database error')
      mockSyncAllSeries.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[RecurrenceSync] syncAllSeries failed',
        expect.objectContaining({
          error: 'Database error',
        })
      )
    })

    it('should handle top-level errors', async () => {
      const error = new Error('Unexpected error')
      mockSyncAllSeries.mockImplementation(() => {
        throw error
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unexpected error' })
    })

    it('should handle non-Error exceptions in syncAllSeries', async () => {
      mockSyncAllSeries.mockRejectedValue('string error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          partial_failure: true,
        })
      )
    })

    it('should track multiple failures', async () => {
      mockSyncAllSeries
        .mockRejectedValueOnce(new Error('Error 1'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[RecurrenceSync] Partial failure',
        expect.objectContaining({
          errors: expect.arrayContaining(['Error 1']),
        })
      )
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockSyncAllSeries).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
