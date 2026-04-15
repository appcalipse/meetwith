/**
 * Tests for file upload utilities
 *
 * Tests utility functions for handling file uploads
 */

import { SIZE_5_MB, withFileUpload } from '@/utils/uploads'
import type { FileData, UploadOptions } from '@/utils/uploads'

describe('uploads', () => {
  describe('constants', () => {
    it('should define SIZE_5_MB constant', () => {
      expect(SIZE_5_MB).toBeDefined()
      expect(SIZE_5_MB).toBe(5242880) // 5 MB in bytes
    })

    it('SIZE_5_MB should be exactly 5 megabytes', () => {
      const expectedBytes = 5 * 1024 * 1024
      expect(SIZE_5_MB).toBe(expectedBytes)
    })
  })

  describe('FileData interface', () => {
    it('should be importable', () => {
      const fileData: FileData = {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('test'),
      }
      expect(fileData).toBeDefined()
    })
  })

  describe('UploadOptions interface', () => {
    it('should allow maxFileSize option', () => {
      const options: UploadOptions = {
        maxFileSize: SIZE_5_MB,
      }
      expect(options.maxFileSize).toBe(SIZE_5_MB)
    })

    it('should allow allowedMimeTypes option', () => {
      const options: UploadOptions = {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      }
      expect(options.allowedMimeTypes).toHaveLength(2)
    })

    it('should allow combined options', () => {
      const options: UploadOptions = {
        maxFileSize: SIZE_5_MB,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      }
      expect(options).toBeDefined()
      expect(options.maxFileSize).toBe(SIZE_5_MB)
      expect(options.allowedMimeTypes).toHaveLength(2)
    })
  })

  describe('withFileUpload', () => {
    it('should return a function', () => {
      const handler = jest.fn()
      const wrapped = withFileUpload(handler)
      expect(typeof wrapped).toBe('function')
    })

    it('should reject non-POST requests with 405', async () => {
      const handler = jest.fn()
      const wrapped = withFileUpload(handler)

      const mockReq = {
        method: 'GET',
        headers: {},
      } as any

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any

      await wrapped(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Method not allowed',
      })
      expect(handler).not.toHaveBeenCalled()
    })
  })
})
