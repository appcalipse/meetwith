/**
 * Tests for file upload utilities
 * 
 * Tests utility functions for handling file uploads
 */

import { SIZE_5_MB } from '@/utils/uploads'

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
      const fileData: import('@/utils/uploads').FileData = {
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('test'),
      }
      expect(fileData).toBeDefined()
    })
  })

  describe('UploadOptions interface', () => {
    it('should allow maxFileSize option', () => {
      const options: import('@/utils/uploads').UploadOptions = {
        maxFileSize: SIZE_5_MB,
      }
      expect(options.maxFileSize).toBe(SIZE_5_MB)
    })

    it('should allow allowedMimeTypes option', () => {
      const options: import('@/utils/uploads').UploadOptions = {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      }
      expect(options.allowedMimeTypes).toHaveLength(2)
    })

    it('should allow combined options', () => {
      const options: import('@/utils/uploads').UploadOptions = {
        maxFileSize: SIZE_5_MB,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      }
      expect(options).toBeDefined()
      expect(options.maxFileSize).toBe(SIZE_5_MB)
      expect(options.allowedMimeTypes).toHaveLength(2)
    })
  })
})
