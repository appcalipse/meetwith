import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { event, data, signature } = req.body

  if (!event || !data) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' })
  }

  return res.status(200).json({ received: true, event })
}

describe('/api/webhook/handler', () => {
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

  it('should return 400 when event is missing', async () => {
    req.body = { data: {}, signature: 'sig' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when data is missing', async () => {
    req.body = { event: 'test.event', signature: 'sig' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 401 when signature is missing', async () => {
    req.body = { event: 'test.event', data: {} }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(401)
  })

  it('should process valid webhook', async () => {
    req.body = {
      event: 'payment.succeeded',
      data: { amount: 1000 },
      signature: 'valid_signature'
    }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      received: true,
      event: 'payment.succeeded'
    })
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

  it('should handle different event types', async () => {
    const events = ['user.created', 'payment.failed', 'subscription.updated']
    
    for (const event of events) {
      req.body = { event, data: {}, signature: 'sig' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(200)
    }
  })

  it('should handle complex data payloads', async () => {
    req.body = {
      event: 'order.completed',
      data: {
        orderId: '123',
        items: [{ id: 1, name: 'Item' }],
        total: 99.99,
        metadata: { source: 'web' }
      },
      signature: 'sig'
    }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should handle empty string signature', async () => {
    req.body = { event: 'test', data: {}, signature: '' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(statusMock).toHaveBeenCalledWith(401)
  })
})
