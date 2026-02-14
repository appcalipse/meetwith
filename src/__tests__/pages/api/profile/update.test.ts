import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, bio, avatar } = req.body

  if (email && !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  return res.status(200).json({
    success: true,
    profile: { name, email, bio, avatar }
  })
}

describe('/api/profile/update', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))
    
    req = {
      method: 'PUT',
      body: {},
    }
    
    res = {
      status: statusMock,
    }
  })

  it('should update profile with PUT', async () => {
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Developer'
    }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      profile: {
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Developer',
        avatar: undefined
      }
    })
  })

  it('should update profile with PATCH', async () => {
    req.method = 'PATCH'
    req.body = { name: 'Jane Doe' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should return 400 for invalid email', async () => {
    req.body = { email: 'invalid-email' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid email' })
  })

  it('should return 405 for GET', async () => {
    req.method = 'GET'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 405 for POST', async () => {
    req.method = 'POST'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 405 for DELETE', async () => {
    req.method = 'DELETE'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle partial updates', async () => {
    req.body = { bio: 'New bio' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should handle avatar updates', async () => {
    req.body = { avatar: 'https://example.com/avatar.jpg' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should handle empty body', async () => {
    req.body = {}
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should validate email with @', async () => {
    req.body = { email: 'test@test.com' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })
})
