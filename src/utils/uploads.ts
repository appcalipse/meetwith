import Busboy from 'busboy'
import { NextApiRequest, NextApiResponse } from 'next'

export interface FileData {
  filename: string
  mimeType: string
  buffer: Buffer
}

export type handlerReqWithFile = NextApiRequest & {
  body: { files?: { [x: string]: FileData } }
}

export interface UploadOptions {
  maxFileSize?: number // in bytes
  allowedMimeTypes?: string[]
}

type NextApiHandlerWithFile = (
  req: handlerReqWithFile,
  res: NextApiResponse
) => void | Promise<void>

function validateFile(
  buffer: Buffer,
  mimeType: string,
  options: UploadOptions
): string | null {
  if (options.maxFileSize && buffer.length > options.maxFileSize) {
    const maxSizeMB = (options.maxFileSize / (1024 * 1024)).toFixed(1)
    const currentSizeMB = (buffer.length / (1024 * 1024)).toFixed(1)
    return `File is too large (${currentSizeMB} MB). Maximum allowed size is ${maxSizeMB} MB.`
  }

  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    if (!options.allowedMimeTypes.includes(mimeType)) {
      const friendlyTypes = options.allowedMimeTypes.map(type => {
        switch (type) {
          case 'image/jpeg':
          case 'image/jpg':
            return 'JPEG images'
          case 'image/png':
            return 'PNG images'
          case 'image/svg':
          case 'image/svg+xml':
            return 'SVG images'
          case 'image/gif':
            return 'GIF images'
          case 'image/webp':
            return 'WebP images'
          case 'application/pdf':
            return 'PDF files'
          case 'text/csv':
            return 'CSV files'
          case 'application/json':
            return 'JSON files'
          default:
            return type
        }
      })

      return `File type not supported. Please upload: ${friendlyTypes.join(
        ', '
      )}.`
    }
  }

  return null
}
const SIZE_10_MB = 10485760 // 10 MB in bytes
export function withFileUpload(
  handler: NextApiHandlerWithFile,
  options: UploadOptions = {
    allowedMimeTypes: ['image/png', 'image/jpg', 'image/webp'],
    maxFileSize: SIZE_10_MB,
  }
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const busboy = Busboy({ headers: req.headers })
    const files: Record<string, FileData> = {}
    const fields: Record<string, string> = {}
    await new Promise<void>((resolve, reject) => {
      busboy.on('field', (fieldname, value) => {
        fields[fieldname] = value
      })
      busboy.on('file', (fieldname, file, info) => {
        const chunks: Uint8Array[] = []

        file.on('data', data => {
          chunks.push(data)
        })
        file.on('limit', () => {
          reject(new Error('File too large'))
        })
        file.on('end', () => {
          const buffer = Buffer.concat(chunks)

          const validationError = validateFile(buffer, info.mimeType, options)
          if (validationError) {
            res.status(400).json({ error: validationError })
            return
          }

          files[fieldname] = {
            buffer,
            filename: info.filename,
            mimeType: info.mimeType,
          }
        })
      })
      busboy.on('finish', () => {
        req.body = {
          ...fields,
          files,
        }
        resolve()
      })

      busboy.on('error', err => {
        reject(err)
      })

      req.pipe(busboy)
    })

    return handler(req, res)
  }
}
