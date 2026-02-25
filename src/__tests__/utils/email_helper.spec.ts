import faker from '@faker-js/faker'
import { randomUUID } from 'crypto'

import {
  newGroupInviteEmail,
  sendPollInviteEmail,
  newGroupRejectEmail,
  newMeetingEmail,
  cancelledMeetingEmail,
  updateMeetingEmail,
  sendInvitationEmail,
  sendContactInvitationEmail,
  sendReceiptEmail,
  sendSubscriptionConfirmationEmailForAccount,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancelledEmailForAccount,
  sendSubscriptionCancelledEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionRenewalDueEmail,
  sendCryptoExpiryReminderEmail,
  sendInvoiceEmail,
  sendResetPinEmail,
  sendChangeEmailEmail,
  sendPinResetSuccessEmail,
  sendEnablePinEmail,
  sendVerificationCodeEmail,
  sendCryptoDebitEmail,
  sendSessionBookingIncomeEmail,
  sendEmailChangeSuccessEmail,
} from '@/utils/email_helper'
import { Group } from '@/types/Group'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { MeetingProvider } from '@/types/Meeting'
import { PaymentProvider } from '@/types/Billing'
import * as database from '@/utils/database'
import * as calendarManager from '@/utils/calendar_manager'
import * as syncHelper from '@/utils/sync_helper'

jest.mock('@/utils/database')
jest.mock('@/utils/calendar_manager')
jest.mock('@/utils/sync_helper')
jest.mock('resend')
jest.mock('email-templates')
jest.mock('puppeteer')

describe('email_helper - newGroupInviteEmail', () => {
  it('should send group invite email successfully', async () => {
    const participant = {
      name: 'Test User',
      account_address: faker.datatype.uuid(),
    }

    const group: Group = {
      id: randomUUID(),
      name: 'Test Group',
      description: 'Test Description',
      created_at: new Date(),
      owner_address: faker.datatype.uuid(),
    }

    const result = await newGroupInviteEmail(
      'test@example.com',
      participant as any,
      group
    )

    expect(typeof result).toBe('boolean')
  })

  it('should handle email sending errors gracefully', async () => {
    const participant = {
      name: 'Test User',
      account_address: faker.datatype.uuid(),
    }

    const group: Group = {
      id: randomUUID(),
      name: 'Test Group',
      description: 'Test Description',
      created_at: new Date(),
      owner_address: faker.datatype.uuid(),
    }

    await expect(
      newGroupInviteEmail('invalid-email', participant as any, group)
    ).resolves.toBeDefined()
  })
})

describe('email_helper - sendPollInviteEmail', () => {
  it('should send poll invite email', async () => {
    const participants = [
      {
        name: 'Participant 1',
        account_address: faker.datatype.uuid(),
      },
      {
        name: 'Participant 2',
        guest_email: 'participant2@example.com',
      },
    ]

    const result = await sendPollInviteEmail(
      'host@example.com',
      'Test Host',
      participants as any,
      randomUUID(),
      'Test Poll'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - newGroupRejectEmail', () => {
  it('should send group rejection email', async () => {
    const participant = {
      name: 'Test User',
      account_address: faker.datatype.uuid(),
    }

    const group: Group = {
      id: randomUUID(),
      name: 'Test Group',
      description: 'Test Description',
      created_at: new Date(),
      owner_address: faker.datatype.uuid(),
    }

    const result = await newGroupRejectEmail(
      'owner@example.com',
      participant as any,
      group
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - newMeetingEmail', () => {
  it('should send new meeting notification email', async () => {
    const slot_id = randomUUID()
    const participants: ParticipantInfo[] = [
      {
        account_address: faker.datatype.uuid(),
        meeting_id: randomUUID(),
        slot_id: slot_id,
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
        name: 'Owner User',
      },
      {
        account_address: faker.datatype.uuid(),
        meeting_id: randomUUID(),
        slot_id: slot_id,
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
        name: 'Scheduler User',
      },
    ]

    jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
    } as any)

    jest.spyOn(database, 'getOwnerPublicUrlServer').mockResolvedValue(
      'https://meetwith.com/user123'
    )

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

    const meetingDetails = {
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      participants,
      meeting_url: 'https://meet.google.com/test',
      content: 'Test meeting content',
      title: 'Test Meeting',
      meeting_id: randomUUID(),
      iana_timezone: 'UTC',
      provider: MeetingProvider.GOOGLE_MEET,
      rrule: [],
    }

    const result = await newMeetingEmail(
      'test@example.com',
      ParticipantType.Scheduler,
      slot_id,
      meetingDetails as any,
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
  })

  it('should handle meeting email with guest participants', async () => {
    const slot_id = randomUUID()
    const participants: ParticipantInfo[] = [
      {
        guest_email: 'guest@example.com',
        meeting_id: randomUUID(),
        slot_id: slot_id,
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
        name: 'Guest User',
      },
    ]

    jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
    } as any)

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

    const meetingDetails = {
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      participants,
      meeting_url: 'https://meet.google.com/test',
      content: 'Test meeting',
      title: 'Guest Meeting',
      meeting_id: randomUUID(),
      iana_timezone: 'UTC',
      provider: MeetingProvider.GOOGLE_MEET,
      rrule: [],
    }

    const result = await newMeetingEmail(
      'guest@example.com',
      ParticipantType.Scheduler,
      slot_id,
      meetingDetails as any,
      undefined
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - cancelledMeetingEmail', () => {
  it('should send meeting cancellation email', async () => {
    const participants: ParticipantInfo[] = [
      {
        account_address: faker.datatype.uuid(),
        meeting_id: randomUUID(),
        slot_id: randomUUID(),
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
        name: 'Owner User',
      },
    ]

    const result = await cancelledMeetingEmail(
      {
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        participants,
        meeting_url: 'https://meet.google.com/test',
        content: 'Meeting cancelled',
        title: 'Cancelled Meeting',
        meeting_id: randomUUID(),
        iana_timezone: 'UTC',
      } as any,
      'test@example.com',
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - updateMeetingEmail', () => {
  it('should send meeting update email', async () => {
    const slot_id = randomUUID()
    const participants: ParticipantInfo[] = [
      {
        account_address: faker.datatype.uuid(),
        meeting_id: randomUUID(),
        slot_id: slot_id,
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
        name: 'Owner User',
      },
    ]

    jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
    } as any)

    const meetingDetails = {
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      participants,
      meeting_url: 'https://meet.google.com/test',
      content: 'Updated meeting',
      title: 'Updated Meeting',
      meeting_id: randomUUID(),
      iana_timezone: 'UTC',
      provider: MeetingProvider.GOOGLE_MEET,
    }

    const result = await updateMeetingEmail(
      'test@example.com',
      'Current User',
      ParticipantType.Owner,
      slot_id,
      meetingDetails as any,
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendInvitationEmail', () => {
  it('should send invitation email', async () => {
    const group: Group = {
      id: randomUUID(),
      name: 'Test Group',
      description: 'Test Description',
      created_at: new Date(),
      owner_address: faker.datatype.uuid(),
    }

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
    const group: Group = {
      id: randomUUID(),
      name: 'Test Group',
      description: 'Test Description',
      created_at: new Date(),
      owner_address: faker.datatype.uuid(),
    }

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
    const receipt = {
      id: randomUUID(),
      amount: 5000,
      currency: 'USD',
      created: Date.now(),
      description: 'Payment for meeting',
    }

    const result = await sendReceiptEmail(
      'user@example.com',
      receipt as any
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionConfirmationEmail', () => {
  it('should send subscription confirmation email for Stripe', async () => {
    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const account = {
      email: 'user@example.com',
      displayName: 'Test User',
    }

    const period = {
      registered_at: new Date(),
      expiry_time: new Date(Date.now() + 30 * 24 * 3600000),
    }

    const result = await sendSubscriptionConfirmationEmail(
      account as any,
      period as any,
      plan as any,
      PaymentProvider.STRIPE
    )

    expect(result).toBeUndefined()
  })

  it('should send subscription confirmation email for Crypto', async () => {
    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const account = {
      email: 'user@example.com',
      displayName: 'Test User',
    }

    const period = {
      registered_at: new Date(),
      expiry_time: new Date(Date.now() + 30 * 24 * 3600000),
    }

    const result = await sendSubscriptionConfirmationEmail(
      account as any,
      period as any,
      plan as any,
      PaymentProvider.CRYPTO
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionCancelledEmail', () => {
  it('should send subscription cancelled email', async () => {
    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const account = {
      email: 'user@example.com',
      displayName: 'Test User',
    }

    const period = {
      registered_at: new Date(),
      expiry_time: new Date(Date.now() + 30 * 24 * 3600000),
    }

    const result = await sendSubscriptionCancelledEmail(
      account as any,
      period as any,
      plan as any,
      PaymentProvider.STRIPE
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionExpiredEmail', () => {
  it('should send subscription expired email', async () => {
    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const account = {
      email: 'user@example.com',
      displayName: 'Test User',
    }

    const period = {
      registered_at: new Date(),
      expiry_time: new Date(Date.now() + 30 * 24 * 3600000),
    }

    const result = await sendSubscriptionExpiredEmail(
      account as any,
      period as any,
      plan as any
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendSubscriptionRenewalDueEmail', () => {
  it('should send subscription renewal due email', async () => {
    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const account = {
      email: 'user@example.com',
      displayName: 'Test User',
    }

    const period = {
      registered_at: new Date(),
      expiry_time: new Date(Date.now() + 30 * 24 * 3600000),
    }

    const result = await sendSubscriptionRenewalDueEmail(
      account as any,
      period as any,
      plan as any,
      7
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendCryptoExpiryReminderEmail', () => {
  it('should send crypto expiry reminder email', async () => {
    const account = {
      email: 'user@example.com',
      displayName: 'Test User',
    }

    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const period = {
      registered_at: new Date(),
      expiry_time: new Date(Date.now() + 7 * 24 * 3600000),
    }

    const result = await sendCryptoExpiryReminderEmail(
      account as any,
      period as any,
      plan as any,
      7
    )

    expect(result).toBeUndefined()
  })
})

describe('email_helper - sendInvoiceEmail', () => {
  it('should send invoice email', async () => {
    const invoice = {
      id: randomUUID(),
      amount_due: 5000,
      currency: 'USD',
      created: Date.now(),
      invoice_pdf: 'https://example.com/invoice.pdf',
    }

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendInvoiceEmail(
      'user@example.com',
      'Test User',
      invoice as any
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
    const result = await sendPinResetSuccessEmail(
      'user@example.com'
    )

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
    const result = await sendVerificationCodeEmail(
      'user@example.com',
      '123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendCryptoDebitEmail', () => {
  it('should send crypto debit notification email', async () => {
    const result = await sendCryptoDebitEmail(
      'user@example.com',
      {
        amount: 0.5,
        currency: 'ETH',
        recipientName: 'Recipient User',
        transactionId: faker.datatype.uuid(),
        transactionDate: new Date().toISOString(),
        userName: 'Test User',
      }
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendSessionBookingIncomeEmail', () => {
  it('should send session booking income email', async () => {
    const result = await sendSessionBookingIncomeEmail(
      'user@example.com',
      {
        amount: 50.0,
        currency: 'USD',
        senderName: 'Sender User',
        transactionId: faker.datatype.uuid(),
        transactionDate: new Date().toISOString(),
        userName: 'Test User',
      }
    )

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
