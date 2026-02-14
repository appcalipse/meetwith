/**
 * Unit tests for /api/server/discord/index endpoint
 * Testing Discord account info retrieval
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getAccountFromDiscordId: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/discord/index'
import * as database from '@/utils/database'

describe('/api/server/discord', () => {
  const mockGetAccountFromDiscordId = database.getAccountFromDiscordId as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockSchedulerAccount = {
    address: '0x123',
    discord_id: 'scheduler-discord-id',
    preferences: {
      name: 'Scheduler',
    },
  }

  const mockParticipantAccount1 = {
    address: '0x456',
    discord_id: 'participant-1',
    preferences: {
      name: 'Participant 1',
    },
  }

  const mockParticipantAccount2 = {
    address: '0x789',
    discord_id: 'participant-2',
    preferences: {
      name: 'Participant 2',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        scheduler_discord_id: 'scheduler-discord-id',
        participantsDiscordIds: ['participant-1', 'participant-2', 'participant-3'],
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/discord', () => {
    it('should get Discord account info successfully', async () => {
      mockGetAccountFromDiscordId
        .mockResolvedValueOnce(mockSchedulerAccount)
        .mockResolvedValueOnce(mockParticipantAccount1)
        .mockResolvedValueOnce(mockParticipantAccount2)
        .mockResolvedValueOnce(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDiscordId).toHaveBeenCalledTimes(4)
      expect(mockGetAccountFromDiscordId).toHaveBeenCalledWith('scheduler-discord-id')
      expect(mockGetAccountFromDiscordId).toHaveBeenCalledWith('participant-1')
      expect(mockGetAccountFromDiscordId).toHaveBeenCalledWith('participant-2')
      expect(mockGetAccountFromDiscordId).toHaveBeenCalledWith('participant-3')

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        accounts: expect.arrayContaining([
          mockSchedulerAccount,
          mockParticipantAccount1,
          mockParticipantAccount2,
        ]),
        discordParticipantIds: expect.arrayContaining(['participant-1', 'participant-2']),
        discordParticipantsWithoutAccountIds: ['participant-3'],
      })
    })

    it('should return 404 when scheduler account not found', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith(
        expect.stringContaining("You don't have a MWW account")
      )
    })

    it('should handle duplicate participant IDs', async () => {
      req.body = {
        scheduler_discord_id: 'scheduler-discord-id',
        participantsDiscordIds: ['participant-1', 'participant-1', 'participant-2'],
      }
      mockGetAccountFromDiscordId
        .mockResolvedValueOnce(mockSchedulerAccount)
        .mockResolvedValueOnce(mockParticipantAccount1)
        .mockResolvedValueOnce(mockParticipantAccount2)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should only call once per unique ID
      expect(mockGetAccountFromDiscordId).toHaveBeenCalledTimes(3)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should not duplicate scheduler account in accounts array', async () => {
      req.body = {
        scheduler_discord_id: 'scheduler-discord-id',
        participantsDiscordIds: ['scheduler-discord-id', 'participant-1'],
      }
      mockGetAccountFromDiscordId
        .mockResolvedValueOnce(mockSchedulerAccount)
        .mockResolvedValueOnce(mockSchedulerAccount)
        .mockResolvedValueOnce(mockParticipantAccount1)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      const response = jsonMock.mock.calls[0][0]
      const schedulerAccounts = response.accounts.filter(
        (a: any) => a.address === mockSchedulerAccount.address
      )
      expect(schedulerAccounts).toHaveLength(1)
    })

    it('should handle all participants without accounts', async () => {
      req.body = {
        scheduler_discord_id: 'scheduler-discord-id',
        participantsDiscordIds: ['participant-1', 'participant-2'],
      }
      mockGetAccountFromDiscordId
        .mockResolvedValueOnce(mockSchedulerAccount)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        accounts: [mockSchedulerAccount],
        discordParticipantIds: [],
        discordParticipantsWithoutAccountIds: expect.arrayContaining([
          'participant-1',
          'participant-2',
        ]),
      })
    })

    it('should handle empty participants list', async () => {
      req.body = {
        scheduler_discord_id: 'scheduler-discord-id',
        participantsDiscordIds: [],
      }
      mockGetAccountFromDiscordId.mockResolvedValueOnce(mockSchedulerAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        accounts: [mockSchedulerAccount],
        discordParticipantIds: [],
        discordParticipantsWithoutAccountIds: [],
      })
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetAccountFromDiscordId).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
