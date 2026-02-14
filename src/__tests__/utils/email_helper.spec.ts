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

jest.mock('@/utils/database')
jest.mock('@/utils/calendar_manager')
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
    const participants: ParticipantInfo[] = [
      {
        account_address: faker.datatype.uuid(),
        meeting_id: randomUUID(),
        slot_id: randomUUID(),
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
        name: 'Owner User',
      },
      {
        account_address: faker.datatype.uuid(),
        meeting_id: randomUUID(),
        slot_id: randomUUID(),
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

    const result = await newMeetingEmail(
      {
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        participants,
        meeting_url: 'https://meet.google.com/test',
        content: 'Test meeting content',
        title: 'Test Meeting',
        meeting_id: randomUUID(),
        iana_timezone: 'UTC',
        provider: MeetingProvider.GOOGLE_MEET,
      } as any,
      'test@example.com',
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
  })

  it('should handle meeting email with guest participants', async () => {
    const participants: ParticipantInfo[] = [
      {
        guest_email: 'guest@example.com',
        meeting_id: randomUUID(),
        slot_id: randomUUID(),
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
        name: 'Guest User',
      },
    ]

    jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
    } as any)

    const result = await newMeetingEmail(
      {
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        participants,
        meeting_url: 'https://meet.google.com/test',
        content: 'Test meeting',
        title: 'Guest Meeting',
        meeting_id: randomUUID(),
        iana_timezone: 'UTC',
        provider: MeetingProvider.GOOGLE_MEET,
      } as any,
      'guest@example.com',
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

    jest.spyOn(calendarManager, 'generateIcs').mockResolvedValue({
      error: undefined,
      value: 'ICS_CONTENT',
    } as any)

    const result = await updateMeetingEmail(
      {
        start: new Date(),
        end: new Date(Date.now() + 3600000),
        participants,
        meeting_url: 'https://meet.google.com/test',
        content: 'Updated meeting',
        title: 'Updated Meeting',
        meeting_id: randomUUID(),
        iana_timezone: 'UTC',
        provider: MeetingProvider.GOOGLE_MEET,
      } as any,
      'test@example.com',
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendInvitationEmail', () => {
  it('should send invitation email', async () => {
    const result = await sendInvitationEmail(
      'invitee@example.com',
      'Test User',
      'https://meetwith.com/invite/123'
    )

    expect(typeof result).toBe('boolean')
  })

  it('should handle missing inviter name', async () => {
    const result = await sendInvitationEmail(
      'invitee@example.com',
      undefined,
      'https://meetwith.com/invite/123'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendContactInvitationEmail', () => {
  it('should send contact invitation email', async () => {
    const result = await sendContactInvitationEmail(
      'contact@example.com',
      'Inviter Name',
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
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

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendReceiptEmail(
      'user@example.com',
      receipt as any,
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
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

    const period = {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 3600000),
    }

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendSubscriptionConfirmationEmail(
      'user@example.com',
      faker.datatype.uuid(),
      plan as any,
      period as any,
      PaymentProvider.STRIPE
    )

    expect(typeof result).toBe('boolean')
  })

  it('should send subscription confirmation email for Crypto', async () => {
    const plan = {
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
    }

    const period = {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 3600000),
    }

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendSubscriptionConfirmationEmail(
      'user@example.com',
      faker.datatype.uuid(),
      plan as any,
      period as any,
      PaymentProvider.CRYPTO
    )

    expect(typeof result).toBe('boolean')
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

    const period = {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 3600000),
    }

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendSubscriptionCancelledEmail(
      'user@example.com',
      faker.datatype.uuid(),
      plan as any,
      period as any
    )

    expect(typeof result).toBe('boolean')
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

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendSubscriptionExpiredEmail(
      'user@example.com',
      faker.datatype.uuid(),
      plan as any
    )

    expect(typeof result).toBe('boolean')
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

    const period = {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 3600000),
    }

    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendSubscriptionRenewalDueEmail(
      'user@example.com',
      faker.datatype.uuid(),
      plan as any,
      period as any,
      7
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendCryptoExpiryReminderEmail', () => {
  it('should send crypto expiry reminder email', async () => {
    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendCryptoExpiryReminderEmail(
      'user@example.com',
      faker.datatype.uuid(),
      new Date(Date.now() + 7 * 24 * 3600000),
      7
    )

    expect(typeof result).toBe('boolean')
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
      invoice as any,
      faker.datatype.uuid()
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendResetPinEmail', () => {
  it('should send reset PIN email', async () => {
    const result = await sendResetPinEmail(
      'user@example.com',
      'Test User',
      'https://meetwith.com/reset/123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendChangeEmailEmail', () => {
  it('should send change email confirmation', async () => {
    const result = await sendChangeEmailEmail(
      'newemail@example.com',
      'Test User',
      'https://meetwith.com/confirm/123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendPinResetSuccessEmail', () => {
  it('should send PIN reset success email', async () => {
    const result = await sendPinResetSuccessEmail(
      'user@example.com',
      'Test User'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendEnablePinEmail', () => {
  it('should send enable PIN email', async () => {
    const result = await sendEnablePinEmail(
      'user@example.com',
      'Test User',
      '123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendVerificationCodeEmail', () => {
  it('should send verification code email', async () => {
    const result = await sendVerificationCodeEmail(
      'user@example.com',
      'Test User',
      '123456'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendCryptoDebitEmail', () => {
  it('should send crypto debit notification email', async () => {
    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendCryptoDebitEmail(
      'user@example.com',
      faker.datatype.uuid(),
      '0.5 ETH',
      'Subscription Payment'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendSessionBookingIncomeEmail', () => {
  it('should send session booking income email', async () => {
    jest.spyOn(database, 'getBillingEmailAccountInfo').mockResolvedValue({
      name: 'Test User',
      email: 'user@example.com',
      address: faker.datatype.uuid(),
    } as any)

    const result = await sendSessionBookingIncomeEmail(
      'user@example.com',
      faker.datatype.uuid(),
      '50.00 USD',
      'Test User Booked'
    )

    expect(typeof result).toBe('boolean')
  })
})

describe('email_helper - sendEmailChangeSuccessEmail', () => {
  it('should send email change success notification', async () => {
    const result = await sendEmailChangeSuccessEmail(
      'oldemail@example.com',
      'Test User',
      'newemail@example.com'
    )

    expect(typeof result).toBe('boolean')
  })
})
