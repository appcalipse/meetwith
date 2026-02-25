import {
  arrayBufferToDataUrl,
  createImage,
  getCroppedImg,
  getCroppedImgRec,
  getRadianAngle,
  readFile,
  rotateSize,
} from '@/utils/image-utils'

// Mock DOM APIs
const createMockCanvas = () => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      globalCompositeOperation: '',
    })),
    toBlob: jest.fn((callback, format, quality) => {
      const blob = new Blob(['fake-image-data'], { type: format || 'image/png' })
      callback(blob)
    }),
  }
  return canvas as any
}

const createMockImage = () => {
  const img = {
    width: 100,
    height: 100,
    addEventListener: jest.fn((event, handler) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    }),
    setAttribute: jest.fn(),
    src: '',
  }
  return img as any
}

describe('image-utils', () => {
  beforeEach(() => {
    global.Image = jest.fn(() => createMockImage()) as any
    global.document.createElement = jest.fn((tag) => {
      if (tag === 'canvas') {
        return createMockCanvas()
      }
      return {} as any
    }) as any
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getRadianAngle', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(getRadianAngle(0)).toBe(0)
    })

    it('should convert 90 degrees to π/2 radians', () => {
      const result = getRadianAngle(90)
      expect(result).toBeCloseTo(Math.PI / 2, 5)
    })

    it('should convert 180 degrees to π radians', () => {
      const result = getRadianAngle(180)
      expect(result).toBeCloseTo(Math.PI, 5)
    })

    it('should convert 360 degrees to 2π radians', () => {
      const result = getRadianAngle(360)
      expect(result).toBeCloseTo(2 * Math.PI, 5)
    })

    it('should handle negative angles', () => {
      const result = getRadianAngle(-90)
      expect(result).toBeCloseTo(-Math.PI / 2, 5)
    })
  })

  describe('rotateSize', () => {
    it('should return original dimensions for 0 rotation', () => {
      const result = rotateSize(100, 50, 0)
      expect(result.width).toBeCloseTo(100, 1)
      expect(result.height).toBeCloseTo(50, 1)
    })

    it('should swap dimensions for 90 degree rotation', () => {
      const result = rotateSize(100, 50, 90)
      expect(result.width).toBeCloseTo(50, 1)
      expect(result.height).toBeCloseTo(100, 1)
    })

    it('should return original dimensions for 180 rotation', () => {
      const result = rotateSize(100, 50, 180)
      expect(result.width).toBeCloseTo(100, 1)
      expect(result.height).toBeCloseTo(50, 1)
    })

    it('should handle square images', () => {
      const result = rotateSize(100, 100, 45)
      expect(result.width).toBeGreaterThan(100)
      expect(result.height).toBeGreaterThan(100)
    })

    it('should handle negative rotations', () => {
      const result = rotateSize(100, 50, -90)
      expect(result.width).toBeCloseTo(50, 1)
      expect(result.height).toBeCloseTo(100, 1)
    })
  })

  describe('createImage', () => {
    it('should create and load an image', async () => {
      const url = 'https://example.com/image.jpg'
      const image = await createImage(url)

      expect(image).toBeDefined()
      expect(image.src).toBe(url)
      expect(image.setAttribute).toHaveBeenCalledWith('crossOrigin', 'anonymous')
    })

    it('should reject on error', async () => {
      const mockImg = createMockImage()
      mockImg.addEventListener = jest.fn((event, handler) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Failed to load')), 0)
        }
      })
      global.Image = jest.fn(() => mockImg) as any

      await expect(createImage('invalid-url')).rejects.toThrow()
    })
  })

  describe('getCroppedImg', () => {
    it('should crop image successfully', async () => {
      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }

      const result = await getCroppedImg(imageSrc, pixelCrop)

      expect(result).toBe('blob:mock-url')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should handle flip options', async () => {
      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }
      const flip = { horizontal: true, vertical: false }

      const result = await getCroppedImg(imageSrc, pixelCrop, flip)

      expect(result).toBe('blob:mock-url')
    })

    it('should use custom format and quality', async () => {
      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }
      const options = { format: 'image/jpeg' as const, quality: 0.9 }

      const result = await getCroppedImg(imageSrc, pixelCrop, undefined, options)

      expect(result).toBe('blob:mock-url')
    })

    it('should return null if no context', async () => {
      const mockCanvas = {
        getContext: jest.fn(() => null),
      }
      global.document.createElement = jest.fn(() => mockCanvas as any) as any

      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }

      const result = await getCroppedImg(imageSrc, pixelCrop)

      expect(result).toBeNull()
    })

    it('should reject if canvas is empty', async () => {
      const mockCanvas = createMockCanvas()
      mockCanvas.toBlob = jest.fn((callback) => callback(null))
      global.document.createElement = jest.fn(() => mockCanvas as any) as any

      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }

      await expect(getCroppedImg(imageSrc, pixelCrop)).rejects.toBe(
        'Canvas is empty'
      )
    })
  })

  describe('getCroppedImgRec', () => {
    it('should crop image to rectangle', async () => {
      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }

      const result = await getCroppedImgRec(imageSrc, pixelCrop)

      expect(result).toBe('blob:mock-url')
    })

    it('should handle flip options', async () => {
      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }
      const flip = { horizontal: false, vertical: true }

      const result = await getCroppedImgRec(imageSrc, pixelCrop, flip)

      expect(result).toBe('blob:mock-url')
    })

    it('should use default PNG format and quality 1', async () => {
      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }

      const result = await getCroppedImgRec(imageSrc, pixelCrop)

      expect(result).toBe('blob:mock-url')
    })

    it('should return null if no context', async () => {
      const mockCanvas = {
        getContext: jest.fn(() => null),
      }
      global.document.createElement = jest.fn(() => mockCanvas as any) as any

      const imageSrc = 'https://example.com/image.jpg'
      const pixelCrop = { x: 10, y: 10, width: 50, height: 50 }

      const result = await getCroppedImgRec(imageSrc, pixelCrop)

      expect(result).toBeNull()
    })
  })

  describe('readFile', () => {
    it('should read file as data URL', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/png' })
      const mockReader = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => {
              mockReader.result = 'data:image/png;base64,test'
              handler()
            }, 0)
          }
        }),
        readAsDataURL: jest.fn(),
        result: null as any,
      }
      global.FileReader = jest.fn(() => mockReader) as any

      const result = await readFile(mockBlob)

      expect(result).toBe('data:image/png;base64,test')
      expect(mockReader.readAsDataURL).toHaveBeenCalledWith(mockBlob)
    })

    it('should handle ArrayBuffer result', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/png' })
      const mockArrayBuffer = new ArrayBuffer(8)
      
      const innerMockReader = {
        onloadend: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(function (this: any) {
          this.result = 'data:image/png;base64,converted'
          setTimeout(() => this.onloadend && this.onloadend(), 0)
        }),
        result: null as any,
      }
      
      const outerMockReader = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => {
              outerMockReader.result = mockArrayBuffer
              global.FileReader = jest.fn(() => innerMockReader) as any
              handler()
            }, 0)
          }
        }),
        readAsDataURL: jest.fn(),
        result: null as any,
      }
      global.FileReader = jest.fn(() => outerMockReader) as any

      const result = await readFile(mockBlob)

      expect(result).toBe('data:image/png;base64,converted')
    })

    it('should handle undefined result', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/png' })
      const mockReader = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => {
              mockReader.result = null
              handler()
            }, 0)
          }
        }),
        readAsDataURL: jest.fn(),
        result: null as any,
      }
      global.FileReader = jest.fn(() => mockReader) as any

      const result = await readFile(mockBlob)

      expect(result).toBeUndefined()
    })
  })

  describe('arrayBufferToDataUrl', () => {
    it('should convert ArrayBuffer to data URL', async () => {
      const buffer = new ArrayBuffer(8)
      const mockReader = {
        onloadend: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(function (this: any) {
          this.result = 'data:image/png;base64,test'
          setTimeout(() => this.onloadend && this.onloadend(), 0)
        }),
        result: null as any,
      }
      global.FileReader = jest.fn(() => mockReader) as any

      const result = await arrayBufferToDataUrl(buffer)

      expect(result).toBe('data:image/png;base64,test')
    })

    it('should use custom MIME type', async () => {
      const buffer = new ArrayBuffer(8)
      const mockReader = {
        onloadend: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(function (this: any) {
          this.result = 'data:image/jpeg;base64,test'
          setTimeout(() => this.onloadend && this.onloadend(), 0)
        }),
        result: null as any,
      }
      global.FileReader = jest.fn(() => mockReader) as any

      const result = await arrayBufferToDataUrl(buffer, 'image/jpeg')

      expect(result).toBe('data:image/jpeg;base64,test')
    })

    it('should reject on non-string result', async () => {
      const buffer = new ArrayBuffer(8)
      const mockReader = {
        onloadend: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(function (this: any) {
          this.result = null
          setTimeout(() => this.onloadend && this.onloadend(), 0)
        }),
        result: null as any,
      }
      global.FileReader = jest.fn(() => mockReader) as any

      await expect(arrayBufferToDataUrl(buffer)).rejects.toThrow(
        'Failed to convert ArrayBuffer to data URL'
      )
    })

    it('should reject on error', async () => {
      const buffer = new ArrayBuffer(8)
      const mockReader = {
        onloadend: null as any,
        onerror: null as any,
        readAsDataURL: jest.fn(function (this: any) {
          setTimeout(() => this.onerror && this.onerror(new Error('Read error')), 0)
        }),
        result: null as any,
      }
      global.FileReader = jest.fn(() => mockReader) as any

      await expect(arrayBufferToDataUrl(buffer)).rejects.toThrow()
    })
  })
})
