import { NextApiRequest, NextApiResponse } from 'next'

import handler from '@/pages/api/401'

describe('401 API endpoint', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonSpy: jest.Mock
  let statusSpy: jest.Mock
  let sendSpy: jest.Mock

  beforeEach(() => {
    jsonSpy = jest.fn()
    statusSpy = jest.fn().mockReturnThis()
    sendSpy = jest.fn()

    mockReq = {}
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      send: sendSpy,
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 status with "Auth required" message', async () => {
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusSpy).toHaveBeenCalledWith(401)
    expect(sendSpy).toHaveBeenCalledWith('Auth required')
  })

  it('should work with any HTTP method', async () => {
    mockReq.method = 'GET'
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusSpy).toHaveBeenCalledWith(401)
    expect(sendSpy).toHaveBeenCalledWith('Auth required')
  })

  it('should work with POST method', async () => {
    mockReq.method = 'POST'
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusSpy).toHaveBeenCalledWith(401)
    expect(sendSpy).toHaveBeenCalledWith('Auth required')
  })
})
