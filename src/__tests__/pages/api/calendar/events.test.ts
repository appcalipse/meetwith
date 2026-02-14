import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { startDate, endDate } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Date range required' })
    }
    
    return res.status(200).json({ events: [] })
  }
  
  if (req.method === 'POST') {
    const { title, start, end } = req.body
    
    if (!title || !start || !end) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    return res.status(201).json({ id: 'event-123', title, start, end })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}

describe('/api/calendar/events', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))
    
    req = {
      query: {},
      body: {},
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('GET /api/calendar/events', () => {
    beforeEach(() => {
      req.method = 'GET'
    })

    it('should return 400 when startDate is missing', async () => {
      req.query = { endDate: '2024-12-31' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 400 when endDate is missing', async () => {
      req.query = { startDate: '2024-01-01' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return events with valid date range', async () => {
      req.query = { startDate: '2024-01-01', endDate: '2024-12-31' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ events: [] })
    })

    it('should handle same start and end date', async () => {
      req.query = { startDate: '2024-01-01', endDate: '2024-01-01' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle empty date strings', async () => {
      req.query = { startDate: '', endDate: '' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('POST /api/calendar/events', () => {
    beforeEach(() => {
      req.method = 'POST'
    })

    it('should return 400 when title is missing', async () => {
      req.body = { start: '2024-01-01T10:00:00', end: '2024-01-01T11:00:00' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 400 when start is missing', async () => {
      req.body = { title: 'Meeting', end: '2024-01-01T11:00:00' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 400 when end is missing', async () => {
      req.body = { title: 'Meeting', start: '2024-01-01T10:00:00' }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should create event with valid data', async () => {
      req.body = {
        title: 'Team Meeting',
        start: '2024-01-01T10:00:00',
        end: '2024-01-01T11:00:00'
      }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        id: 'event-123',
        title: 'Team Meeting',
        start: '2024-01-01T10:00:00',
        end: '2024-01-01T11:00:00'
      })
    })

    it('should handle empty string title', async () => {
      req.body = {
        title: '',
        start: '2024-01-01T10:00:00',
        end: '2024-01-01T11:00:00'
      }
      
      await handler(req as NextApiRequest, res as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('other methods', () => {
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
  })
})
