import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { meetingId, scheduledTime, attendees } = req.body

  if (!meetingId) {
    return res.status(400).json({ error: 'Meeting ID required' })
  }

  if (!scheduledTime) {
    return res.status(400).json({ error: 'Scheduled time required' })
  }

  if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
    return res.status(400).json({ error: 'Attendees required' })
  }

  return res.status(200).json({
    success: true,
    meetingId,
    scheduledTime,
    attendees
  })
}

describe('/api/meeting/schedule', () => {
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

  it('should return 400 when meetingId missing', async () => {
    req.body = { scheduledTime: '2024-01-01T10:00:00', attendees: ['user@example.com'] }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when scheduledTime missing', async () => {
    req.body = { meetingId: 'meeting-123', attendees: ['user@example.com'] }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when attendees missing', async () => {
    req.body = { meetingId: 'meeting-123', scheduledTime: '2024-01-01T10:00:00' }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when attendees not array', async () => {
    req.body = {
      meetingId: 'meeting-123',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: 'not-an-array'
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should return 400 when attendees empty', async () => {
    req.body = {
      meetingId: 'meeting-123',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: []
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should schedule meeting with valid data', async () => {
    req.body = {
      meetingId: 'meeting-123',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: ['user1@example.com', 'user2@example.com']
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      meetingId: 'meeting-123',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: ['user1@example.com', 'user2@example.com']
    })
  })

  it('should handle single attendee', async () => {
    req.body = {
      meetingId: 'meeting-123',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: ['user@example.com']
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(200)
  })

  it('should handle many attendees', async () => {
    const manyAttendees = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`)
    req.body = {
      meetingId: 'meeting-123',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: manyAttendees
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

  it('should handle null meetingId', async () => {
    req.body = {
      meetingId: null,
      scheduledTime: '2024-01-01T10:00:00',
      attendees: ['user@example.com']
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle empty string meetingId', async () => {
    req.body = {
      meetingId: '',
      scheduledTime: '2024-01-01T10:00:00',
      attendees: ['user@example.com']
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle empty string scheduledTime', async () => {
    req.body = {
      meetingId: 'meeting-123',
      scheduledTime: '',
      attendees: ['user@example.com']
    }
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(400)
  })

  it('should handle different time formats', async () => {
    const times = [
      '2024-01-01T10:00:00Z',
      '2024-01-01T10:00:00.000Z',
      '2024-01-01T10:00:00-05:00'
    ]
    for (const time of times) {
      req.body = {
        meetingId: 'meeting-123',
        scheduledTime: time,
        attendees: ['user@example.com']
      }
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(200)
    }
  })
})
