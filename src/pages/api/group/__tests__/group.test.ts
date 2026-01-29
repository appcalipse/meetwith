import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../[group_id]/index'
import { getGroupName, initDB } from '@/utils/database'
import { GroupNotExistsError, NotGroupMemberError } from '@/utils/errors'

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: (handler: any) => handler,
}))

jest.mock('@/utils/database', () => ({
  getGroupName: jest.fn(),
  initDB: jest.fn(),
}))

describe('API: /group/[group_id]', () => {
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

  it('should return group details for valid group_id', async () => {
    req.query = { group_id: 'group-123' }
    const mockGroup = { id: 'group-123', name: 'Test Group' }
    ;(getGroupName as jest.Mock).mockResolvedValue(mockGroup)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(initDB).toHaveBeenCalled()
    expect(getGroupName).toHaveBeenCalledWith('group-123')
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(mockGroup)
  })

  it('should return 403 when user is not group member', async () => {
    req.query = { group_id: 'group-123' }
    const error = new NotGroupMemberError('Not a member')
    ;(getGroupName as jest.Mock).mockRejectedValue(error)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Not a member' })
  })

  it('should return 404 when group does not exist', async () => {
    req.query = { group_id: 'nonexistent' }
    const error = new GroupNotExistsError('Group not found')
    ;(getGroupName as jest.Mock).mockRejectedValue(error)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Group not found' })
  })

  it('should return 500 for other errors', async () => {
    req.query = { group_id: 'group-123' }
    const error = new Error('Database error')
    ;(getGroupName as jest.Mock).mockRejectedValue(error)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(500)
    expect(sendMock).toHaveBeenCalledWith(error)
  })

  it('should return 405 for POST method', async () => {
    req.method = 'POST'
    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(405)
    expect(sendMock).toHaveBeenCalledWith('Method not allowed')
  })

  it('should return 405 for PUT method', async () => {
    req.method = 'PUT'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should return 405 for DELETE method', async () => {
    req.method = 'DELETE'
    await handler(req as NextApiRequest, res as NextApiResponse)
    expect(statusMock).toHaveBeenCalledWith(405)
  })

  it('should handle empty group_id', async () => {
    req.query = { group_id: '' }
    ;(getGroupName as jest.Mock).mockRejectedValue(new Error('Empty ID'))

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(500)
  })
})
