import * as Sentry from '@sentry/nextjs'
import { create, IPFSHTTPClient } from 'ipfs-http-client'

import { isProduction } from './constants'

class IPFSHelper {
  path: string
  ipfs?: IPFSHTTPClient

  constructor(path?: string) {
    this.path = path || './ipfs'
  }

  startIPFS = async (): Promise<void> => {
    if (!this.ipfs) {
      const options = {
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization:
            'Basic ' +
            Buffer.from(
              process.env.NEXT_INFURA_ID + ':' + process.env.NEXT_INFURA_SECRET
            ).toString('base64'),
        },
      }

      this.ipfs = await create(options)
    }
  }

  addContentToIPFS = async (content: object): Promise<string> => {
    await this.startIPFS()
    try {
      const { path } = await this.ipfs!.add(JSON.stringify(content), {
        pin: isProduction,
      })
      return path
    } catch (e) {
      Sentry.captureException(e)
      throw new Error('IPFS issue')
    }
  }

  fetchContentFromIPFS = async (path: string): Promise<object> => {
    await this.startIPFS()
    const stream = await this.ipfs!.cat(path)

    const data = []
    try {
      for await (const chunk of stream) {
        data.push(chunk)
      }
    } catch (err) {
      //TODO add error handling
      console.error(err)
    }

    return JSON.parse(Buffer.concat(data).toString())
  }
}

const ipfsInstance = new IPFSHelper()

export const addContentToIPFS = async (content: object): Promise<string> => {
  return ipfsInstance.addContentToIPFS(content)
}

export const fetchContentFromIPFS = async (path: string): Promise<object> => {
  return ipfsInstance.fetchContentFromIPFS(path)
}
