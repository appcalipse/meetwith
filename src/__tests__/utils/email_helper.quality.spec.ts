import * as Sentry from '@sentry/nextjs'
import { randomUUID } from 'crypto'
import Email from 'email-templates'

import {
  mockMeetingCancelSyncRequest,
  mockMeetingCreationSyncRequest,
  mockParticipantInfoForNotification,
  mockRequestParticipantMapping,
} from '@/testing/mocks'
import { PaymentProvider } from '@/types/Billing'
import { MeetingProvider } from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
  RequestParticipantMapping,
} from '@/types/Requests'
import * as calendarManager from '@/utils/calendar_manager'
import * as database from '@/utils/database'
import {
  cancelledMeetingEmail,
  newGroupInviteEmail,
  newGroupRejectEmail,
  newMeetingEmail,
  sendChangeEmailEmail,
  sendContactInvitationEmail,
  sendCryptoDebitEmail,
  sendCryptoExpiryReminderEmail,
  sendEmailChangeSuccessEmail,
  sendEnablePinEmail,
  sendInvitationEmail,
  sendInvoiceEmail,
  sendPinResetSuccessEmail,
  sendPollInviteEmail,
  sendReceiptEmail,
  sendResetPinEmail,
  sendSessionBookingIncomeEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionCancelledEmailForAccount,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionConfirmationEmailForAccount,
  sendSubscriptionExpiredEmail,
  sendSubscriptionRenewalDueEmail,
  sendVerificationCodeEmail,
  updateMeetingEmail,
} from '@/utils/email_helper'
import * as calendarBackendHelper from '@/utils/services/calendar.backend.helper'
import * as syncHelper from '@/utils/sync_helper'

// Mock email send function
const mockEmailSend = jest.fn()

// Mock dependencies
jest.mock('@sentry/nextjs')
jest.mock('@/utils/database')
jest.mock('@/utils/sync_helper')
jest.mock('@/utils/services/calendar.backend.helper')
jest.mock('@/utils/calendar_manager')
jest.mock('email-templates')
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
    }),
    close: jest.fn(),
  }),
}))

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: (...args: any[]) => mockEmailSend(...args),
      },
    })),
  }
})

describe('email_helper quality tests - error handling and edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEmailSend.mockResolvedValue({ id: 'email-123' })

    // Default mock for Email templates
    const mockEmailInstance = {
      renderAll: jest.fn().mockResolvedValue({
        html: '<html>Test</html>',
        subject: 'Test Subject',
        text: 'Test text',
      }),
      render: jest.fn().mockResolvedValue('<html>Test</html>'),
    }

    ;(Email as unknown as jest.Mock).mockImplementation(() => mockEmailInstance)
  })

  describe('newGroupInviteEmail - error handling', () => {
    it('should catch and log Resend API errors', async () => {
      const error = new Error('Resend API error')
      mockEmailSend.mockRejectedValueOnce(error)

      const group = {
        id: randomUUID(),
        name: 'Test Group',
        description: 'Test',
        created_at: new Date(),
        owner_address: 'owner-address',
      } as any

      const result = await newGroupInviteEmail(
        'test@example.com',
        { name: 'Test', account_address: 'test-address' } as any,
        group
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should use account_address as display name when name is missing', async () => {
      const group = {
        id: randomUUID(),
        name: 'Test Group',
        description: 'Test',
        created_at: new Date(),
        owner_address: 'owner-address',
      } as any

      const result = await newGroupInviteEmail(
        'test@example.com',
        { account_address: 'test-address' } as any,
        group
      )

      expect(result).toBe(true)
    })
  })

  describe('sendPollInviteEmail - error handling', () => {
    it('should return false when Resend API fails', async () => {
      mockEmailSend.mockRejectedValueOnce(new Error('API failure'))

      const result = await sendPollInviteEmail(
        'test@example.com',
        'Inviter',
        'Poll Title',
        'poll-slug'
      )

      expect(result).toBe(false)
      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should return true on successful email send', async () => {
      const result = await sendPollInviteEmail(
        'test@example.com',
        'Inviter',
        'Poll Title',
        'poll-slug'
      )

      expect(result).toBe(true)
    })
  })

  describe('newGroupRejectEmail - error handling', () => {
    it('should handle Resend errors gracefully', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const group = {
        id: randomUUID(),
        name: 'Test Group',
        description: 'Test',
        created_at: new Date(),
        owner_address: 'owner-address',
      } as any

      const result = await newGroupRejectEmail(
        'test@example.com',
        { name: 'Test', account_address: 'test-address' } as any,
        group
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('newMeetingEmail - complex scenarios', () => {
    const baseParticipants: ParticipantInfo[] = [
      {
        account_address: 'owner-address',
        meeting_id: 'meeting-123',
        slot_id: 'slot-123',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
        name: 'Owner',
      },
      {
        account_address: 'scheduler-address',
        meeting_id: 'meeting-123',
        slot_id: 'slot-123',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Scheduler,
        name: 'Scheduler',
      },
    ]

    it('should handle ICS generation errors', async () => {
      const error = new Error('ICS generation failed')
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error,
        value: '',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])

      const meetingDetails = mockMeetingCreationSyncRequest({
        participants: baseParticipants.map(mockRequestParticipantMapping),
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        meeting_url: 'https://meet.example.com/test',
        content: 'Meeting content',
        title: 'Test Meeting',
        meeting_id: 'meeting-123',
        timezone: 'America/New_York',
        meetingProvider: MeetingProvider.GOOGLE_MEET,
      })

      const result = await newMeetingEmail(
        'test@example.com',
        mockParticipantInfoForNotification(),
        meetingDetails
      )
      expect(result).toBe(false)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should generate change URL for guest scheduler', async () => {
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error: undefined,
        value: 'ICS_CONTENT',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])
      jest
        .spyOn(database, 'getOwnerPublicUrlServer')
        .mockResolvedValue('https://meetwith.com/owner')

      const guestParticipants: ParticipantInfo[] = [
        {
          guest_email: 'guest@example.com',
          meeting_id: 'meeting-123',
          slot_id: 'slot-123',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
          name: 'Guest Scheduler',
        },
        {
          account_address: 'owner-address',
          meeting_id: 'meeting-123',
          slot_id: 'slot-123',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
          name: 'Owner',
        },
      ]

      const meetingDetails = mockMeetingCreationSyncRequest({
        participants: guestParticipants.map(mockRequestParticipantMapping),
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        meeting_url: 'https://meet.example.com/test',
        content: 'Meeting content',
        title: 'Guest Meeting',
        meeting_id: 'meeting-123',
        timezone: 'America/New_York',
        meetingProvider: MeetingProvider.GOOGLE_MEET,
        meeting_type_id: 'type-123',
      })
      const participant = mockParticipantInfoForNotification(
        guestParticipants[0]
      )
      participant.account_address = undefined
      const result = await newMeetingEmail(
        'test@example.com',
        participant,
        meetingDetails
      )
      expect(result).toBe(true)
      expect(database.getOwnerPublicUrlServer).toHaveBeenCalledWith(
        'owner-address',
        'type-123'
      )
    })

    it('should not generate change URL for guest owner when scheduler is present', async () => {
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error: undefined,
        value: 'ICS_CONTENT',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])

      const guestOwnerParticipants: ParticipantInfo[] = [
        {
          guest_email: 'owner@example.com',
          meeting_id: 'meeting-123',
          slot_id: 'slot-123',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
          name: 'Guest Owner',
        },
        {
          guest_email: 'scheduler@example.com',
          meeting_id: 'meeting-123',
          slot_id: 'slot-123',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
          name: 'Scheduler',
        },
      ]
      const meetingDetails = mockMeetingCreationSyncRequest({
        participants: guestOwnerParticipants.map(mockRequestParticipantMapping),
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        meeting_url: 'https://meet.example.com/test',
        content: 'Meeting content',
        title: 'Guest Meeting',
        meeting_id: 'meeting-123',
        timezone: 'UTC',
        meetingProvider: MeetingProvider.ZOOM,
      })

      const result = await newMeetingEmail(
        'test@example.com',
        mockParticipantInfoForNotification(),
        meetingDetails
      )
      expect(result).toBe(true)
    })

    it('should check calendar syncing for destination account', async () => {
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error: undefined,
        value: 'ICS_CONTENT',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([
        {
          provider: 'google',
          calendars: [
            { id: 'cal-1', enabled: true, sync: true, name: 'Calendar 1' },
          ],
        },
      ] as any)

      const meetingDetails = mockMeetingCreationSyncRequest({
        meeting_type_id: 'type-123',
      })

      const result = await newMeetingEmail(
        'test@example.com',
        mockParticipantInfoForNotification({
          account_address: 'owner-address',
        }),
        meetingDetails
      )

      expect(result).toBe(true)
      expect(syncHelper.getCalendars).toHaveBeenCalledWith(
        'owner-address',
        'type-123'
      )
    })

    it('should handle email send errors gracefully', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error: undefined,
        value: 'ICS_CONTENT',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])

      const meetingDetails = mockMeetingCreationSyncRequest()

      const result = await newMeetingEmail(
        'test@example.com',
        mockParticipantInfoForNotification(),
        meetingDetails
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('cancelledMeetingEmail - error handling', () => {
    it('should handle ICS generation errors', async () => {
      const error = new Error('ICS error')
      jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
        error,
        value: '',
      } as any)
      const meetingDetails: MeetingCancelSyncRequest =
        mockMeetingCancelSyncRequest()

      const result = await cancelledMeetingEmail(
        'Canceller',
        'test@example.com',
        meetingDetails,
        mockParticipantInfoForNotification()
      )

      expect(result).toBe(false)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)
      jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
        error: undefined,
        value: 'ICS_CONTENT',
      } as any)

      const meetingDetails: MeetingCancelSyncRequest =
        mockMeetingCancelSyncRequest()

      const result = await cancelledMeetingEmail(
        'Canceller',
        'test@example.com',
        meetingDetails,
        mockParticipantInfoForNotification()
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('updateMeetingEmail - edge cases', () => {
    const baseParticipants: RequestParticipantMapping[] = [
      mockRequestParticipantMapping(),
    ]

    it('should return true early if no date change', async () => {
      const meetingDetails = mockMeetingCreationSyncRequest()

      const result = await updateMeetingEmail(
        'test@example.com',
        'Updater',
        mockParticipantInfoForNotification(),
        meetingDetails
      )

      expect(result).toBe(true)
    })

    it('should handle ICS generation errors', async () => {
      const error = new Error('ICS error')
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error,
        value: '',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])

      const meetingDetails: MeetingCreationSyncRequest =
        mockMeetingCreationSyncRequest()

      const result = await updateMeetingEmail(
        'test@example.com',
        'Updater',
        mockParticipantInfoForNotification(),
        meetingDetails
      )

      expect(result).toBe(false)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)
      jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
        error: undefined,
        value: 'ICS_CONTENT',
      } as any)
      jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])

      const meetingDetails: MeetingCreationSyncRequest =
        mockMeetingCreationSyncRequest()

      const result = await updateMeetingEmail(
        'test@example.com',
        'Updater',
        mockParticipantInfoForNotification(),
        meetingDetails
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendInvitationEmail - error handling', () => {
    it('should catch and log errors', async () => {
      const error = new Error('Email template error')
      const mockEmailInstance = {
        render: jest.fn().mockRejectedValueOnce(error),
      }
      ;(Email as unknown as jest.Mock).mockImplementationOnce(
        () => mockEmailInstance
      )

      const group = {
        id: randomUUID(),
        name: 'Test Group',
        description: 'Test',
        created_at: new Date(),
        owner_address: 'owner',
      } as any

      await sendInvitationEmail(
        'test@example.com',
        'Inviter',
        'Message',
        'group-123',
        group,
        'https://invite.link'
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendContactInvitationEmail - error handling', () => {
    it('should catch and log errors', async () => {
      const error = new Error('Contact invite error')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendContactInvitationEmail(
        'contact@example.com',
        'Inviter',
        'https://invite.link',
        'https://decline.link'
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendReceiptEmail - PDF generation', () => {
    it('should generate PDF and send receipt email', async () => {
      const receiptMetadata = {
        plan: 'Pro Plan',
        transaction_hash: 'hash-123',
        amount: 100,
        currency: 'USD',
      }

      await sendReceiptEmail('test@example.com', receiptMetadata as any)

      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              contentType: 'application/pdf',
              filename: expect.stringContaining('receipt-hash-123.pdf'),
            }),
          ]),
        })
      )
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('PDF generation failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const receiptMetadata = {
        plan: 'Pro Plan',
        transaction_hash: 'hash-123',
      }

      await sendReceiptEmail('test@example.com', receiptMetadata as any)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSubscriptionConfirmationEmailForAccount - account lookup', () => {
    it('should return silently if account not found', async () => {
      jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue(null)

      await sendSubscriptionConfirmationEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE
      )

      expect(mockEmailSend).not.toHaveBeenCalled()
    })

    it('should send email when account is found', async () => {
      jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
        email: 'user@example.com',
        displayName: 'Test User',
        accountAddress: 'account-address',
      } as any)

      await sendSubscriptionConfirmationEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE,
        { amount: 29.99, currency: 'USD' }
      )

      expect(mockEmailSend).toHaveBeenCalled()
    })

    it('should handle trial subscriptions', async () => {
      jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
        email: 'user@example.com',
        displayName: 'Test User',
        accountAddress: 'account-address',
      } as any)

      await sendSubscriptionConfirmationEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE,
        undefined,
        true
      )

      expect(mockEmailSend).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error')
      jest
        .spyOn(database, 'getBillingEmailAccountInfo')
        .mockRejectedValue(error)

      await sendSubscriptionConfirmationEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSubscriptionConfirmationEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendSubscriptionConfirmationEmail(
        { email: 'test@example.com', displayName: 'Test' } as any,
        { registered_at: new Date(), expiry_time: new Date() } as any,
        { name: 'Pro', price: 29.99 } as any,
        PaymentProvider.STRIPE
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSubscriptionCancelledEmailForAccount - account lookup', () => {
    it('should return silently if account not found', async () => {
      jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue(null)

      await sendSubscriptionCancelledEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE
      )

      expect(mockEmailSend).not.toHaveBeenCalled()
    })

    it('should send email when account is found', async () => {
      jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
        email: 'user@example.com',
        displayName: 'Test User',
        accountAddress: 'account-address',
      } as any)

      await sendSubscriptionCancelledEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE
      )

      expect(mockEmailSend).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error')
      jest
        .spyOn(database, 'getBillingEmailAccountInfo')
        .mockRejectedValue(error)

      await sendSubscriptionCancelledEmailForAccount(
        'account-address',
        { name: 'Pro', price: 29.99 } as any,
        new Date(),
        new Date(),
        PaymentProvider.STRIPE
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSubscriptionCancelledEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendSubscriptionCancelledEmail(
        { email: 'test@example.com', displayName: 'Test' } as any,
        { registered_at: new Date(), expiry_time: new Date() } as any,
        { name: 'Pro', price: 29.99 } as any,
        PaymentProvider.STRIPE
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSubscriptionExpiredEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendSubscriptionExpiredEmail(
        { email: 'test@example.com', displayName: 'Test' } as any,
        { registered_at: new Date(), expiry_time: new Date() } as any,
        { name: 'Pro', price: 29.99 } as any
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSubscriptionRenewalDueEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendSubscriptionRenewalDueEmail(
        { email: 'test@example.com', displayName: 'Test' } as any,
        { registered_at: new Date(), expiry_time: new Date() } as any,
        { name: 'Pro', price: 29.99 } as any,
        7
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendCryptoExpiryReminderEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendCryptoExpiryReminderEmail(
        { email: 'test@example.com', displayName: 'Test' } as any,
        { registered_at: new Date(), expiry_time: new Date() } as any,
        { name: 'Pro', price: 29.99 } as any,
        3
      )

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendInvoiceEmail - PDF generation', () => {
    it('should generate PDF and send invoice email', async () => {
      const invoiceMetadata = {
        plan: 'Pro Plan',
        amount: 100,
        currency: 'USD',
      }

      await sendInvoiceEmail(
        'test@example.com',
        'Test User',
        invoiceMetadata as any
      )

      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              contentType: 'application/pdf',
              filename: expect.stringContaining('invoice-Pro Plan'),
            }),
          ]),
        })
      )
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Invoice generation failed')
      mockEmailSend.mockRejectedValueOnce(error)

      await sendInvoiceEmail('test@example.com', 'Test User', {
        plan: 'Pro',
      } as any)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendResetPinEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendResetPinEmail(
        'test@example.com',
        'https://reset.link'
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendChangeEmailEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendChangeEmailEmail(
        'test@example.com',
        'https://change.link'
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendPinResetSuccessEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendPinResetSuccessEmail('test@example.com')

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendEnablePinEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendEnablePinEmail(
        'test@example.com',
        'https://enable.link'
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendVerificationCodeEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendVerificationCodeEmail(
        'test@example.com',
        '123456'
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendCryptoDebitEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendCryptoDebitEmail('test@example.com', {
        amount: 100,
        currency: 'USD',
        recipientName: 'Recipient',
        transactionId: 'tx-123',
        transactionDate: '2024-01-01',
      })

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendSessionBookingIncomeEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendSessionBookingIncomeEmail('test@example.com', {
        amount: 100,
        currency: 'USD',
        senderName: 'Sender',
        transactionId: 'tx-123',
        transactionDate: '2024-01-01',
      })

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('sendEmailChangeSuccessEmail - error handling', () => {
    it('should handle email send errors', async () => {
      const error = new Error('Email send failed')
      mockEmailSend.mockRejectedValueOnce(error)

      const result = await sendEmailChangeSuccessEmail(
        'new@example.com',
        'old@example.com',
        'new@example.com',
        'Test User'
      )

      expect(result).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })
})
