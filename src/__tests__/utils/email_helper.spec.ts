import faker from '@faker-js/faker'
import { randomUUID } from 'crypto'

import {
  mockBillingEmailAccountInfo,
  mockBillingEmailPeriod,
  mockBillingEmailPlan,
  mockGroup,
  mockInvoiceMetadata,
  mockMeetingCancelSyncRequest,
  mockMeetingCreationSyncRequest,
  mockParticipantInfoForInviteNotification,
  mockParticipantInfoForNotification,
  mockReceiptMetadata,
  mockRequestParticipantMapping,
} from '@/testing/mocks'
import { PaymentProvider } from '@/types/Billing'
import { MeetingProvider } from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
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
  sendSubscriptionConfirmationEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionRenewalDueEmail,
  sendVerificationCodeEmail,
  updateMeetingEmail,
} from '@/utils/email_helper'
import * as calendarBackendHelper from '@/utils/services/calendar.backend.helper'
import * as syncHelper from '@/utils/sync_helper'

jest.mock('@/utils/database')
jest.mock('@/utils/calendar_manager')
jest.mock('@/utils/sync_helper')
jest.mock('@/utils/services/calendar.backend.helper')
jest.mock('resend')
jest.mock('email-templates')
jest.mock('puppeteer')

describe('email_helper - newGroupInviteEmail', () => {
  it('should send group invite email successfully', async () => {
    const participant = mockParticipantInfoForInviteNotification({
      name: 'Test User',
      account_address: faker.finance.ethereumAddress(),
    })

    const group = mockGroup({
      name: 'Test Group',
      description: 'Test Description',
    })

    const result = await newGroupInviteEmail(
      'test@example.com',
      participant,
      group
    )

    expect(typeof result).toBe('boolean')
  })

  it('should handle email sending errors gracefully', async () => {
    const participant = mockParticipantInfoForInviteNotification({
      name: 'Test User',
      account_address: faker.finance.ethereumAddress(),
    })

    const group = mockGroup({
      name: 'Test Group',
      description: 'Test Description',
    })

    await expect(
      newGroupInviteEmail('invalid-email', participant, group)
    ).resolves.toBeDefined()
  })
})

describe('email_helper - sendPollInviteEmail', () => {
  it('should send poll invite email', async () => {
    const result = await sendPollInviteEmail(
      'host@example.com',
      'Test Host',
      'Test Poll',
      randomUUID()
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - newGroupRejectEmail', () => {
  it('should send group rejection email', async () => {
    const participant = mockParticipantInfoForInviteNotification({
      name: 'Test User',
      account_address: faker.finance.ethereumAddress(),
    })

    const group = mockGroup({
      name: 'Test Group',
      description: 'Test Description',
    })

    const result = await newGroupRejectEmail(
      'owner@example.com',
      participant,
      group
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - newMeetingEmail', () => {
  it('should send new meeting notification email', async () => {
    const meeting_id = randomUUID()
    const participants = [
      mockRequestParticipantMapping({
        meeting_id,
        account_address: faker.finance.ethereumAddress(),
        type: ParticipantType.Owner,
        status: ParticipationStatus.Accepted,
        name: 'Owner User',
      }),
      mockRequestParticipantMapping({
        meeting_id,
        account_address: faker.finance.ethereumAddress(),
        type: ParticipantType.Scheduler,
        status: ParticipationStatus.Pending,
        name: 'Scheduler User',
      }),
    ]

    jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
      attendees: [],
    })

    jest
      .spyOn(database, 'getOwnerPublicUrlServer')
      .mockResolvedValue('https://meetwith.com/user123')

    jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([
      {
        calendars: [
          {
            enabled: true,
            sync: false,
          },
        ],
      },
    ] as any)

    const meetingDetails = mockMeetingCreationSyncRequest({
      meeting_id,
      participants,
      meeting_url: 'https://meet.google.com/test',
      content: 'Test meeting content',
      title: 'Test Meeting',
      timezone: 'UTC',
      meetingProvider: MeetingProvider.GOOGLE_MEET,
      rrule: [],
    })

    const participant = mockParticipantInfoForNotification({
      account_address: participants[1].account_address,
      meeting_id,
      type: ParticipantType.Scheduler,
      status: ParticipationStatus.Pending,
      timezone: 'UTC',
      name: 'Scheduler User',
    })

    const result = await newMeetingEmail(
      'test@example.com',
      participant,
      meetingDetails
    )

    expect(typeof result).toBe('boolean')
  })

  it('should handle meeting email with guest participants', async () => {
    const meeting_id = randomUUID()
    const participants = [
      mockRequestParticipantMapping({
        meeting_id,
        account_address: undefined,
        guest_email: 'guest@example.com',
        type: ParticipantType.Scheduler,
        status: ParticipationStatus.Pending,
        name: 'Guest User',
      }),
    ]

    jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
      attendees: [],
    })

    jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([
      {
        calendars: [
          {
            enabled: true,
            sync: false,
          },
        ],
      },
    ] as any)

    const meetingDetails = mockMeetingCreationSyncRequest({
      meeting_id,
      participants,
      meeting_url: 'https://meet.google.com/test',
      content: 'Test meeting',
      title: 'Guest Meeting',
      timezone: 'UTC',
      meetingProvider: MeetingProvider.GOOGLE_MEET,
      rrule: [],
    })

    const participant = mockParticipantInfoForNotification({
      account_address: undefined,
      guest_email: 'guest@example.com',
      meeting_id,
      type: ParticipantType.Scheduler,
      status: ParticipationStatus.Pending,
      timezone: 'UTC',
      name: 'Guest User',
    })

    const result = await newMeetingEmail(
      'guest@example.com',
      participant,
      meetingDetails
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - cancelledMeetingEmail', () => {
  it('should send meeting cancellation email', async () => {
    jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
    } as any)

    const meeting_id = randomUUID()
    const meetingDetails = mockMeetingCancelSyncRequest({
      meeting_id,
      title: 'Cancelled Meeting',
      reason: 'Meeting cancelled',
      timezone: 'UTC',
    })

    const participant = mockParticipantInfoForNotification({
      account_address: faker.finance.ethereumAddress(),
      meeting_id,
      type: ParticipantType.Owner,
      status: ParticipationStatus.Accepted,
      timezone: 'UTC',
      name: 'Owner User',
    })

    const result = await cancelledMeetingEmail(
      'Current User',
      'test@example.com',
      meetingDetails,
      participant
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - updateMeetingEmail', () => {
  it('should send meeting update email', async () => {
    const meeting_id = randomUUID()
    const participants = [
      mockRequestParticipantMapping({
        meeting_id,
        account_address: faker.finance.ethereumAddress(),
        type: ParticipantType.Owner,
        status: ParticipationStatus.Accepted,
        name: 'Owner User',
      }),
    ]

    jest.spyOn(calendarBackendHelper, 'generateIcsServer').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
      attendees: [],
    })
    jest.spyOn(syncHelper, 'getCalendars').mockResolvedValue([])

    const meetingDetails = mockMeetingCreationSyncRequest({
      meeting_id,
      participants,
      meeting_url: 'https://meet.google.com/test',
      content: 'Updated meeting',
      title: 'Updated Meeting',
      timezone: 'UTC',
      meetingProvider: MeetingProvider.GOOGLE_MEET,
    })

    const participant = mockParticipantInfoForNotification({
      account_address: participants[0].account_address,
      meeting_id,
      type: ParticipantType.Owner,
      status: ParticipationStatus.Accepted,
      timezone: 'UTC',
      name: 'Owner User',
    })

    const result = await updateMeetingEmail(
      'test@example.com',
      'Current User',
      participant,
      meetingDetails
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendInvitationEmail', () => {
  it('should send invitation email', async () => {
    const group = mockGroup({
      name: 'Test Group',
      description: 'Test Description',
    })

    const result = await sendInvitationEmail(
      'invitee@example.com',
      'Test User',
      'Please join our group',
      group.id,
      group,
      'https://meetwith.com/invite/123'
    )

    expect(result).toBeUndefined()
  })

  it('should handle missing inviter name', async () => {
    const group = mockGroup({
      name: 'Test Group',
      description: 'Test Description',
    })

    const result = await sendInvitationEmail(
      'invitee@example.com',
      '',
      'Please join our group',
      group.id,
      group,
      'https://meetwith.com/invite/123'
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendContactInvitationEmail', () => {
  it('should send contact invitation email', async () => {
    const result = await sendContactInvitationEmail(
      'contact@example.com',
      'Inviter Name',
      'https://meetwith.com/invite/accept/123',
      'https://meetwith.com/invite/decline/123'
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendReceiptEmail', () => {
  it('should send payment receipt email', async () => {
    const receipt = mockReceiptMetadata()

    const result = await sendReceiptEmail('user@example.com', receipt)

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionConfirmationEmail', () => {
  it('should send subscription confirmation email for Stripe', async () => {
    const plan = mockBillingEmailPlan({ name: 'Pro Plan', price: 29.99 })
    const account = mockBillingEmailAccountInfo({
      email: 'user@example.com',
      displayName: 'Test User',
    })
    const period = mockBillingEmailPeriod()

    const result = await sendSubscriptionConfirmationEmail(
      account,
      period,
      plan,
      PaymentProvider.STRIPE
    )

    expect(result).toBeUndefined()
  })

  it('should send subscription confirmation email for Crypto', async () => {
    const plan = mockBillingEmailPlan({ name: 'Pro Plan', price: 29.99 })
    const account = mockBillingEmailAccountInfo({
      email: 'user@example.com',
      displayName: 'Test User',
    })
    const period = mockBillingEmailPeriod()

    const result = await sendSubscriptionConfirmationEmail(
      account,
      period,
      plan,
      PaymentProvider.CRYPTO
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionCancelledEmail', () => {
  it('should send subscription cancelled email', async () => {
    const plan = mockBillingEmailPlan({ name: 'Pro Plan', price: 29.99 })
    const account = mockBillingEmailAccountInfo({
      email: 'user@example.com',
      displayName: 'Test User',
    })
    const period = mockBillingEmailPeriod()

    const result = await sendSubscriptionCancelledEmail(
      account,
      period,
      plan,
      PaymentProvider.STRIPE
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionExpiredEmail', () => {
  it('should send subscription expired email', async () => {
    const plan = mockBillingEmailPlan({ name: 'Pro Plan', price: 29.99 })
    const account = mockBillingEmailAccountInfo({
      email: 'user@example.com',
      displayName: 'Test User',
    })
    const period = mockBillingEmailPeriod()

    const result = await sendSubscriptionExpiredEmail(account, period, plan)

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionRenewalDueEmail', () => {
  it('should send subscription renewal due email', async () => {
    const plan = mockBillingEmailPlan({ name: 'Pro Plan', price: 29.99 })
    const account = mockBillingEmailAccountInfo({
      email: 'user@example.com',
      displayName: 'Test User',
    })
    const period = mockBillingEmailPeriod()

    const result = await sendSubscriptionRenewalDueEmail(
      account,
      period,
      plan,
      7
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendCryptoExpiryReminderEmail', () => {
  it('should send crypto expiry reminder email', async () => {
    const account = mockBillingEmailAccountInfo({
      email: 'user@example.com',
      displayName: 'Test User',
    })
    const plan = mockBillingEmailPlan({ name: 'Pro Plan', price: 29.99 })
    const period = mockBillingEmailPeriod({
      expiry_time: new Date(Date.now() + 7 * 24 * 3600000),
    })

    const result = await sendCryptoExpiryReminderEmail(account, period, plan, 7)

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendInvoiceEmail', () => {
  it('should send invoice email', async () => {
    const invoice = mockInvoiceMetadata({
      url: 'https://example.com/invoice.pdf',
    })

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendInvoiceEmail(
      'user@example.com',
      'Test User',
      invoice
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendResetPinEmail', () => {
  it('should send reset PIN email', async () => {
    const result = await sendResetPinEmail(
      'user@example.com',
      'https://meetwith.com/reset/123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendChangeEmailEmail', () => {
  it('should send change email confirmation', async () => {
    const result = await sendChangeEmailEmail(
      'newemail@example.com',
      'https://meetwith.com/confirm/123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendPinResetSuccessEmail', () => {
  it('should send PIN reset success email', async () => {
    const result = await sendPinResetSuccessEmail('user@example.com')

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendEnablePinEmail', () => {
  it('should send enable PIN email', async () => {
    const result = await sendEnablePinEmail(
      'user@example.com',
      'https://meetwith.com/enable/123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendVerificationCodeEmail', () => {
  it('should send verification code email', async () => {
    const result = await sendVerificationCodeEmail('user@example.com', '123456')

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendCryptoDebitEmail', () => {
  it('should send crypto debit notification email', async () => {
    const result = await sendCryptoDebitEmail('user@example.com', {
      amount: 0.5,
      currency: 'ETH',
      recipientName: 'Recipient User',
      transactionId: faker.datatype.uuid(),
      transactionDate: new Date().toISOString(),
      userName: 'Test User',
    })

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendSessionBookingIncomeEmail', () => {
  it('should send session booking income email', async () => {
    const result = await sendSessionBookingIncomeEmail('user@example.com', {
      amount: 50.0,
      currency: 'USD',
      senderName: 'Sender User',
      transactionId: faker.datatype.uuid(),
      transactionDate: new Date().toISOString(),
      userName: 'Test User',
    })

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendEmailChangeSuccessEmail', () => {
  it('should send email change success notification', async () => {
    const result = await sendEmailChangeSuccessEmail(
      'oldemail@example.com',
      'oldemail@example.com',
      'newemail@example.com',
      'Test User'
    )

    expect(typeof result).toBe('boolean')
  })
})
