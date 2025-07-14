import Busboy from 'busboy'
import { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  api: {
    bodyParser: false,
  },
}

export interface FileData {
  filename: string
  buffer: Buffer
}

export type handlerReqWithFile = NextApiRequest & {
  body: { files?: { [x: string]: FileData } }
}

type NextApiHandlerWithFile = (
  req: handlerReqWithFile,
  res: NextApiResponse
) => void | Promise<void>

export function withFileUpload(handler: NextApiHandlerWithFile) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const busboy = Busboy({ headers: req.headers })
    const files: Record<string, { filename: string; buffer: Buffer }> = {}

    await new Promise<void>((resolve, reject) => {
      busboy.on('file', (fieldname, file, info) => {
        const chunks: Uint8Array[] = []

        file.on('data', data => {
          chunks.push(data)
        })
        file.on('limit', () => {
          reject(new Error('File too large'))
        })
        file.on('end', () => {
          files[fieldname] = {
            filename: info.filename,
            buffer: Buffer.concat(chunks),
          }
        })
      })
      busboy.on('finish', () => {
        req.body = {
          ...req.body,
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
