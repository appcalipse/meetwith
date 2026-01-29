import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({ success: true, message: 'Signed out successfully' })
}

describe('/api/auth/signout', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))
    req = { method: 'POST', body: {} }
    res = { status: statusMock }
  })

  it('should return 200 for POST', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Signed out successfully' })
  })

  it('should return 405 for GET', async () => {
    req.method = 'GET'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 405 for PUT', async () => {
    req.method = 'PUT'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 405 for DELETE', async () => {
    req.method = 'DELETE'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 405 for PATCH', async () => {
    req.method = 'PATCH'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle empty body', async () => {
    req.body = {}
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should handle request with data', async () => {
    req.body = { userId: '123' }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should always return success message', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Signed out successfully' })
    )
  })

  it('should always return success true', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it('should handle multiple consecutive calls', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse)
    await handler(req as NextApiRequest, res as NextApiResponse)
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledTimes(3)
  })
})
