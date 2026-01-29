import { NextApiRequest, NextApiResponse } from 'next'
import getDefaultSignature from '../signature/[address]'
import { getAccountFromDB } from '@/utils/database'
import { DEFAULT_MESSAGE } from '@/utils/constants'

jest.mock('@/utils/database', () => ({
  getAccountFromDB: jest.fn(),
}))

jest.mock('@/utils/constants', () => ({
  DEFAULT_MESSAGE: jest.fn((nonce) => `Sign message with nonce: ${nonce}`),
}))

describe('API: /auth/signature/[address]', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let sendMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn().mockReturnThis()

    req = {
      method: 'GET',
      query: {},
    }

    res = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    }

    jest.clearAllMocks()
  })

  it('should return signature for existing account', async () => {
    req.query = { address: '0xABC123' }
    const mockAccount = { nonce: 12345 }
    ;(getAccountFromDB as jest.Mock).mockResolvedValue(mockAccount)

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(getAccountFromDB).toHaveBeenCalledWith('0xabc123')
    expect(DEFAULT_MESSAGE).toHaveBeenCalledWith(12345)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Sign message with nonce: 12345',
      nonce: 12345,
    })
  })

  it('should lowercase the address', async () => {
    req.query = { address: '0xABCDEF' }
    const mockAccount = { nonce: 54321 }
    ;(getAccountFromDB as jest.Mock).mockResolvedValue(mockAccount)

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(getAccountFromDB).toHaveBeenCalledWith('0xabcdef')
  })

  it('should generate random nonce for non-existing account', async () => {
    req.query = { address: '0xNEW123' }
    ;(getAccountFromDB as jest.Mock).mockRejectedValue(new Error('Not found'))

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        nonce: expect.any(Number),
      })
    )
  })

  it('should handle database errors gracefully', async () => {
    req.query = { address: '0xERROR' }
    ;(getAccountFromDB as jest.Mock).mockRejectedValue(new Error('DB Error'))

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(sendMock).toHaveBeenCalled()
  })

  it('should return 404 for non-GET methods', async () => {
    req.method = 'POST'
    req.query = { address: '0xABC123' }

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(sendMock).toHaveBeenCalledWith('Not found')
  })

  it('should return 404 for PUT method', async () => {
    req.method = 'PUT'
    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(404)
  })

  it('should return 404 for DELETE method', async () => {
    req.method = 'DELETE'
    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(404)
  })

  it('should return 404 for PATCH method', async () => {
    req.method = 'PATCH'
    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(404)
  })

  it('should handle empty address', async () => {
    req.query = { address: '' }
    ;(getAccountFromDB as jest.Mock).mockRejectedValue(new Error('Empty'))

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(getAccountFromDB).toHaveBeenCalledWith('')
  })

  it('should handle special characters in address', async () => {
    req.query = { address: '0x@#$%' }
    ;(getAccountFromDB as jest.Mock).mockRejectedValue(new Error('Invalid'))

    await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should generate different random nonces', async () => {
    req.query = { address: '0xNEW' }
    ;(getAccountFromDB as jest.Mock).mockRejectedValue(new Error('Not found'))

    const nonces: number[] = []
    for (let i = 0; i < 5; i++) {
      sendMock.mockClear()
      await getDefaultSignature(req as NextApiRequest, res as NextApiResponse)
      const call = sendMock.mock.calls[0][0]
      nonces.push(call.nonce)
    }

    // Check that at least some nonces are different
    const uniqueNonces = new Set(nonces)
    expect(uniqueNonces.size).toBeGreaterThan(1)
  })
})
