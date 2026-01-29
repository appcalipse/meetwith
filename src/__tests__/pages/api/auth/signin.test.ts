import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' })
  }

  return res.status(200).json({ success: true })
}

describe('/api/auth/signin', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))
    
    req = {
      method: 'POST',
      body: {},
    }
    
    res = {
      status: statusMock,
    }
  })

  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should return 400 when email is missing', async () => {
    req.body = { password: 'test123' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing credentials' })
  })

  it('should return 400 when password is missing', async () => {
    req.body = { email: 'test@example.com' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing credentials' })
  })

  it('should return 400 when both credentials are missing', async () => {
    req.body = {}
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing credentials' })
  })

  it('should return 200 with valid credentials', async () => {
    req.body = { email: 'test@example.com', password: 'test123' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({ success: true })
  })

  it('should handle PUT request with 405', async () => {
    req.method = 'PUT'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle DELETE request with 405', async () => {
    req.method = 'DELETE'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle PATCH request with 405', async () => {
    req.method = 'PATCH'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle empty string email', async () => {
    req.body = { email: '', password: 'test123' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle empty string password', async () => {
    req.body = { email: 'test@example.com', password: '' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle null email', async () => {
    req.body = { email: null, password: 'test123' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle null password', async () => {
    req.body = { email: 'test@example.com', password: null }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle undefined email', async () => {
    req.body = { password: 'test123' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle undefined password', async () => {
    req.body = { email: 'test@example.com' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle extra fields in body', async () => {
    req.body = {
      email: 'test@example.com',
      password: 'test123',
      extra: 'field'
    }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })
})
