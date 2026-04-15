/**
 * Unit tests for /api/server/webhook/expire-subscriptions endpoint
 * Testing subscription expiration webhook functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  expireStaleSubscriptionPeriods: jest.fn(),
  getBillingEmailAccountInfo: jest.fn(),
  getBillingPlanById: jest.fn(),
  getAccountNotificationSubscriptions: jest.fn(),
  getDiscordAccount: jest.fn(),
}))

jest.mock('@/utils/email_helper', () => ({
  sendSubscriptionExpiredEmail: jest.fn(),
}))

jest.mock('@/utils/email_utils', () => ({
  getDisplayNameForEmail: jest.fn(name => name),
}))

jest.mock('@/utils/services/discord.helper', () => ({
  dmAccount: jest.fn(),
}))

jest.mock('@/utils/services/telegram.helper', () => ({
  sendDm: jest.fn(),
}))

jest.mock('@/utils/workers/email.queue', () => ({
  EmailQueue: jest.fn().mockImplementation(() => ({
    add: jest.fn(fn => fn()),
  })),
}))

jest.mock('@/utils/constants', () => ({
  appUrl: 'https://meetwith.xyz',
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/server/webhook/expire-subscriptions'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'
import { dmAccount } from '@/utils/services/discord.helper'
import { sendDm } from '@/utils/services/telegram.helper'
import { NotificationChannel } from '@/types/AccountNotifications'

describe('/api/server/webhook/expire-subscriptions', () => {
  const mockExpireStaleSubscriptionPeriods =
    database.expireStaleSubscriptionPeriods as jest.Mock
  const mockGetBillingEmailAccountInfo = database.getBillingEmailAccountInfo as jest.Mock
  const mockGetBillingPlanById = database.getBillingPlanById as jest.Mock
  const mockGetAccountNotificationSubscriptions =
    database.getAccountNotificationSubscriptions as jest.Mock
  const mockGetDiscordAccount = database.getDiscordAccount as jest.Mock
  const mockSendSubscriptionExpiredEmail = emailHelper.sendSubscriptionExpiredEmail as jest.Mock
  const mockDmAccount = dmAccount as jest.Mock
  const mockSendDm = sendDm as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockPeriod = {
    id: 'period-123',
    owner_account: '0x123',
    billing_plan_id: 'plan-456',
    status: 'expired',
    expiry_time: new Date(),
    registered_at: new Date(),
  }

  const mockResult = {
    expiredCount: 1,
    timestamp: '2024-01-01T10:00:00Z',
    expiredPeriods: [mockPeriod],
  }

  const mockAccountInfo = {
    email: 'user@example.com',
    displayName: 'John Doe',
  }

  const mockBillingPlan = {
    id: 'plan-456',
    name: 'Pro Plan',
    price: 10,
    billing_cycle: 'monthly',
  }

  const mockNotifications = {
    notification_types: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/webhook/expire-subscriptions', () => {
    it('should expire subscriptions successfully', async () => {
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(mockNotifications)
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExpireStaleSubscriptionPeriods).toHaveBeenCalled()
      expect(mockSendSubscriptionExpiredEmail).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          expiredCount: 1,
          emailCount: 1,
          discordCount: 0,
          telegramCount: 0,
          success: true,
        })
      )
    })

    it('should send Discord notification when enabled', async () => {
      const notificationsWithDiscord = {
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-channel',
            disabled: false,
          },
        ],
      }
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithDiscord)
      mockGetDiscordAccount.mockResolvedValue({ discord_id: 'discord-123' })
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)
      mockDmAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetDiscordAccount).toHaveBeenCalledWith('0x123')
      expect(mockDmAccount).toHaveBeenCalledWith(
        '0x123',
        'discord-123',
        expect.stringContaining('Pro Plan')
      )
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          discordCount: 1,
        })
      )
    })

    it('should send Telegram notification when enabled', async () => {
      const notificationsWithTelegram = {
        notification_types: [
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'tg-chat-123',
            disabled: false,
          },
        ],
      }
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithTelegram)
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)
      mockSendDm.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendDm).toHaveBeenCalledWith(
        'tg-chat-123',
        expect.stringContaining('Pro Plan')
      )
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramCount: 1,
        })
      )
    })

    it('should skip disabled notifications', async () => {
      const notificationsWithDisabled = {
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-channel',
            disabled: true,
          },
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'tg-chat',
            disabled: true,
          },
        ],
      }
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithDisabled)
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDmAccount).not.toHaveBeenCalled()
      expect(mockSendDm).not.toHaveBeenCalled()
    })

    it('should handle periods without billing_plan_id', async () => {
      const resultWithoutPlan = {
        ...mockResult,
        expiredPeriods: [{ ...mockPeriod, billing_plan_id: null }],
      }
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(resultWithoutPlan)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetBillingEmailAccountInfo).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing account info gracefully', async () => {
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetBillingPlanById).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing billing plan gracefully', async () => {
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendSubscriptionExpiredEmail).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle Discord notification errors', async () => {
      const notificationsWithDiscord = {
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-channel',
            disabled: false,
          },
        ],
      }
      const error = new Error('Discord API error')
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithDiscord)
      mockGetDiscordAccount.mockResolvedValue({ discord_id: 'discord-123' })
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)
      mockDmAccount.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object))
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle Telegram notification errors', async () => {
      const notificationsWithTelegram = {
        notification_types: [
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'tg-chat-123',
            disabled: false,
          },
        ],
      }
      const error = new Error('Telegram API error')
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithTelegram)
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)
      mockSendDm.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object))
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle zero expired subscriptions', async () => {
      mockExpireStaleSubscriptionPeriods.mockResolvedValue({
        expiredCount: 0,
        timestamp: '2024-01-01T10:00:00Z',
        expiredPeriods: [],
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          expiredCount: 0,
          emailCount: 0,
        })
      )
    })

    it('should handle top-level errors', async () => {
      const error = new Error('Database error')
      mockExpireStaleSubscriptionPeriods.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database error',
        success: false,
      })
    })

    it('should include renewal URL in notification messages', async () => {
      const notificationsWithDiscord = {
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-channel',
            disabled: false,
          },
        ],
      }
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithDiscord)
      mockGetDiscordAccount.mockResolvedValue({ discord_id: 'discord-123' })
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)
      mockDmAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDmAccount).toHaveBeenCalledWith(
        '0x123',
        'discord-123',
        expect.stringContaining('https://meetwith.xyz/dashboard/settings/subscriptions/billing')
      )
    })

    it('should not send Discord notification if account has no discord_id', async () => {
      const notificationsWithDiscord = {
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-channel',
            disabled: false,
          },
        ],
      }
      mockExpireStaleSubscriptionPeriods.mockResolvedValue(mockResult)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(notificationsWithDiscord)
      mockGetDiscordAccount.mockResolvedValue({ discord_id: null })
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDmAccount).not.toHaveBeenCalled()
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockExpireStaleSubscriptionPeriods).not.toHaveBeenCalled()
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
  })
})
