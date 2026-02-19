import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, duration, participants } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  if (!duration || duration <= 0) {
    return res.status(400).json({ error: 'Valid duration is required' })
  }

  return res.status(201).json({
    id: 'meeting-123',
    title,
    duration,
    participants: participants || [],
  })
}

describe('/api/meeting/create', () => {
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

  it('should return 405 for GET requests', async () => {
    req.method = 'GET'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 400 when title is missing', async () => {
    req.body = { duration: 30 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Title is required' })
  })

  it('should return 400 when duration is missing', async () => {
    req.body = { title: 'Test Meeting' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Valid duration is required' })
  })

  it('should return 400 when duration is zero', async () => {
    req.body = { title: 'Test Meeting', duration: 0 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when duration is negative', async () => {
    req.body = { title: 'Test Meeting', duration: -30 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should create meeting with valid data', async () => {
    req.body = { title: 'Test Meeting', duration: 30 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(201)
    expect(jsonMock).toHaveBeenCalledWith({
      id: 'meeting-123',
      title: 'Test Meeting',
      duration: 30,
      participants: [],
    })
  })

  it('should create meeting with participants', async () => {
    req.body = {
      title: 'Test Meeting',
      duration: 30,
      participants: ['user1@example.com', 'user2@example.com']
    }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(201)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        participants: ['user1@example.com', 'user2@example.com']
      })
    )
  })

  it('should handle empty string title', async () => {
    req.body = { title: '', duration: 30 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle null title', async () => {
    req.body = { title: null, duration: 30 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle string duration', async () => {
    req.body = { title: 'Test', duration: 'invalid' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle PUT request', async () => {
    req.method = 'PUT'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle DELETE request', async () => {
    req.method = 'DELETE'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should create meeting with long title', async () => {
    const longTitle = 'A'.repeat(200)
    req.body = { title: longTitle, duration: 60 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(201)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: longTitle })
    )
  })

  it('should create meeting with large duration', async () => {
    req.body = { title: 'Test', duration: 480 }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(201)
  })

  it('should handle empty participants array', async () => {
    req.body = { title: 'Test', duration: 30, participants: [] }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(201)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ participants: [] })
    )
  })
})
