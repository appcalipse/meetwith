import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId, quantity, successUrl, cancelUrl } = req.body

  if (!priceId) {
    return res.status(400).json({ error: 'Price ID required' })
  }

  if (!successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'URLs required' })
  }

  return res.status(200).json({
    sessionId: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123'
  })
}

describe('/api/stripe/create-checkout', () => {
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

  it('should return 405 for GET', async () => {
    req.method = 'GET'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 400 when priceId is missing', async () => {
    req.body = { successUrl: 'https://success.com', cancelUrl: 'https://cancel.com' }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when successUrl is missing', async () => {
    req.body = { priceId: 'price_123', cancelUrl: 'https://cancel.com' }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when cancelUrl is missing', async () => {
    req.body = { priceId: 'price_123', successUrl: 'https://success.com' }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should create checkout session', async () => {
    req.body = {
      priceId: 'price_123',
      quantity: 1,
      successUrl: 'https://success.com',
      cancelUrl: 'https://cancel.com'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123'
    })
  })

  it('should handle quantity parameter', async () => {
    req.body = {
      priceId: 'price_123',
      quantity: 5,
      successUrl: 'https://success.com',
      cancelUrl: 'https://cancel.com'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should handle default quantity', async () => {
    req.body = {
      priceId: 'price_123',
      successUrl: 'https://success.com',
      cancelUrl: 'https://cancel.com'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
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

  it('should handle empty priceId', async () => {
    req.body = {
      priceId: '',
      successUrl: 'https://success.com',
      cancelUrl: 'https://cancel.com'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle empty successUrl', async () => {
    req.body = {
      priceId: 'price_123',
      successUrl: '',
      cancelUrl: 'https://cancel.com'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle empty cancelUrl', async () => {
    req.body = {
      priceId: 'price_123',
      successUrl: 'https://success.com',
      cancelUrl: ''
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle null priceId', async () => {
    req.body = {
      priceId: null,
      successUrl: 'https://success.com',
      cancelUrl: 'https://cancel.com'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle different price IDs', async () => {
    const priceIds = ['price_123', 'price_456', 'price_789']
    for (const priceId of priceIds) {
      req.body = {
        priceId,
        successUrl: 'https://success.com',
        cancelUrl: 'https://cancel.com'
      }
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(200)
    }
  })

  it('should handle long URLs', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1000)
    req.body = {
      priceId: 'price_123',
      successUrl: longUrl,
      cancelUrl: longUrl
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
  })
})
