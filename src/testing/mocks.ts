import faker from '@faker-js/faker'
import { randomUUID } from 'crypto'
import type { Encrypted } from 'eth-crypto'
import { Account, PaymentPreferences } from '@/types/Account'
import {
  AccountNotifications,
  NotificationChannel,
} from '@/types/AccountNotifications'
import {
  BillingEmailAccountInfo,
  BillingEmailPeriod,
  BillingEmailPlan,
} from '@/types/Billing'
import {
  AttendeeStatus,
  EventStatus,
  UnifiedAttendee,
  UnifiedEvent,
} from '@/types/Calendar'
import { SupportedChain } from '@/types/chains'
import { ConditionRelation, MeetingReminders } from '@/types/common'
import type { Group } from '@/types/Group'
import {
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  ParticipantMappingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  AddParticipantRequest,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import {
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
  RequestParticipantMapping,
} from '@/types/Requests'
import {
  GateCondition,
  GateInterface,
  TokenGateElement,
} from '@/types/TokenGating'
import {
  ICheckoutMetadata,
  InvoiceMetadata,
  ReceiptMetadata,
} from '@/types/Transactions'
import { MeetingPermissions } from '@/utils/constants/schedule'
import type {
  ParticipantInfoForInviteNotification,
  ParticipantInfoForNotification,
} from '@/utils/notification_helper'
import {
  WebDAVEvent,
  WebDAVEventExtensions,
} from '@/utils/services/caldav.mapper'
export const DAI_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_AMOY,
  itemId: '0xcb7f6c752e00da963038f1bae79aafbca8473a36',
  itemName: 'Dai Stablecoin',
  itemSymbol: 'DAI',
  minimumBalance: BigInt(1e18),
  type: GateInterface.ERC20,
}

export const USDC_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_AMOY,
  itemId: '0xD33572f6DD1bb0D99C8397c8efE640Cf973EaF3B',
  itemName: 'USD Coin',
  itemSymbol: 'USDC',
  minimumBalance: 0n,
  type: GateInterface.ERC20,
}

export const USDT_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_AMOY,
  itemId: '0x36fEe18b265FBf21A89AD63ea158F342a7C64abB',
  itemName: 'USDT Test Token',
  itemSymbol: 'USDT',
  minimumBalance: 1n,
  type: GateInterface.ERC20,
}

export const NFT_ELEMENT: TokenGateElement = {
  chain: SupportedChain.POLYGON_MATIC,
  itemId: '0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9',
  itemName: 'Non-Fungible Matic',
  itemSymbol: 'NFM',
  minimumBalance: 1n,
  type: GateInterface.ERC721,
}

export const POAP_MWW: TokenGateElement = {
  itemId: '33550',
  itemName: 'Meetwith early supporters',
  itemSymbol: '',
  minimumBalance: 1n,
  type: GateInterface.POAP,
}

export const POAP_RANDOM: TokenGateElement = {
  itemId: '3350',
  itemName: 'imnotArt test 3',
  itemSymbol: '',
  minimumBalance: 1n,
  type: GateInterface.POAP,
}

export const CONDITION_MOCK_DAI_OR_USDT: GateCondition = {
  conditions: [],
  elements: [DAI_ELEMENT, USDT_ELEMENT],
  relation: ConditionRelation.OR,
}

export const CONDITION_NFT: GateCondition = {
  conditions: [],
  elements: [NFT_ELEMENT],
  relation: ConditionRelation.AND,
}

export const CONDITION_USDC: GateCondition = {
  conditions: [],
  elements: [USDC_ELEMENT],
  relation: ConditionRelation.AND,
}

export const CONDITION_NFT_AND_DAI_OR_USDT: GateCondition = {
  conditions: [CONDITION_MOCK_DAI_OR_USDT, CONDITION_NFT],
  elements: [],
  relation: ConditionRelation.AND,
}

export const CONDITION_NFT_AND_USDT: GateCondition = {
  conditions: [],
  elements: [NFT_ELEMENT, USDT_ELEMENT],
  relation: ConditionRelation.AND,
}

export const CONDITION_RANDOM_POAP: GateCondition = {
  conditions: [],
  elements: [POAP_RANDOM],
  relation: ConditionRelation.AND,
}

export const CONDITION_MWW_POAP: GateCondition = {
  conditions: [],
  elements: [POAP_MWW],
  relation: ConditionRelation.AND,
}
export const mockAccount = (
  internal_pub_key: string = 'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
  address: string = faker.finance.ethereumAddress()
): Account => {
  return {
    address: address,
    created_at: faker.date.past(),
    encoded_signature: faker.datatype.string(),
    id: faker.datatype.uuid(),
    internal_pub_key: internal_pub_key || faker.finance.ethereumAddress(),
    is_invited: faker.datatype.boolean(),
    nonce: faker.datatype.number(),
    payment_preferences: null,
    preferences: {
      availabilities: [],
      description: faker.datatype.string(),
      meetingProviders: [MeetingProvider.GOOGLE_MEET],
      name: faker.name.firstName(),
      socialLinks: [],
      timezone: faker.address.timeZone(),
    },
    subscriptions: [],
  }
}
export const mockMeetingDecrypted = (
  accountAddress: string,
  participants?: ParticipantInfo[]
): MeetingDecrypted => ({
  id: 'meeting-123',
  meeting_id: randomUUID(),

  participants: participants || [
    {
      account_address: accountAddress,
      slot_id: 'meeting-123',
      status: ParticipationStatus.Accepted,
      type: ParticipantType.Owner,
    } as ParticipantInfo,
  ],
  related_slot_ids: [],
  start: new Date(),
  end: new Date(),
  created_at: new Date(),
  version: 0,
  recurrence: MeetingRepeat.NO_REPEAT,
  meeting_info_encrypted: {
    ciphertext: 'encrypted-data',
    iv: 'iv-data',
    ephemPublicKey: 'salt-data',
    mac: 'mac-data',
  },
  meeting_url: 'https://example.com/meeting',
  rrule: ['RRULE:FREQ=DAILY;COUNT=5'],
  content: 'Meeting content',
  permissions: [
    MeetingPermissions.INVITE_GUESTS,
    MeetingPermissions.EDIT_MEETING,
    MeetingPermissions.SCHEDULE_MEETING,
    MeetingPermissions.SEE_GUEST_LIST,
  ],
})

export const mockMeetingInfo = (
  participants: ParticipantInfo[],
  meeting_id = randomUUID(),
  related_slot_ids: string[] = []
) => ({
  change_history_paths: [],
  created_at: new Date(),
  meeting_id,
  meeting_url: '',
  participants,
  related_slot_ids,
  rrule: [],
})

export const mockAddQuickPollParticipant = (
  pollId: string = randomUUID(),
  accountAddress: string = faker.finance.ethereumAddress(),
  guestEmail: string = faker.internet.email()
): AddParticipantRequest => ({
  poll_id: pollId,
  account_address: accountAddress,
  guest_email: guestEmail,
  guest_name: faker.random.word(),
  participant_type: QuickPollParticipantType.OWNER,
})

export const mockPaymentPreferences = (): PaymentPreferences => ({
  owner_account_address: faker.finance.ethereumAddress(),
})

export const mockCheckoutMetadata = (
  overrides: Partial<ICheckoutMetadata> = {}
): ICheckoutMetadata => ({
  meeting_type_id:
    overrides.meeting_type_id ?? `meeting-type-${faker.datatype.number()}`,
  guest_name: overrides.guest_name ?? faker.name.firstName(),
  transaction_id: overrides.transaction_id ?? randomUUID(),
  ...overrides,
})

const mockEncryptedInfo = (): Encrypted => ({
  ciphertext: 'ciphertext',
  iv: 'iv',
  ephemPublicKey: 'ephem-public-key',
  mac: 'mac',
})

export const mockRequestParticipantMapping = (
  overrides: Partial<RequestParticipantMapping> = {}
): RequestParticipantMapping => {
  const meeting_id = overrides.meeting_id ?? randomUUID()

  const base: RequestParticipantMapping = {
    account_address: faker.finance.ethereumAddress(),
    slot_id: randomUUID(),
    meeting_id,
    type: ParticipantType.Invitee,
    privateInfo: mockEncryptedInfo(),
    privateInfoHash: faker.datatype.string(),
    timeZone: faker.address.timeZone(),
    name: faker.name.firstName(),
    status: ParticipationStatus.Pending,
  }

  return { ...base, ...overrides }
}

export const mockMeetingCreationSyncRequest = (
  overrides: Partial<MeetingCreationSyncRequest> = {}
): MeetingCreationSyncRequest => {
  const meeting_id = overrides.meeting_id ?? randomUUID()
  const participants = overrides.participants ?? [
    mockRequestParticipantMapping({ meeting_id }),
  ]

  return {
    participantActing: overrides.participantActing ?? {
      account_address: faker.finance.ethereumAddress(),
      name: faker.name.firstName(),
      guest_email: faker.internet.email(),
    },
    meeting_id,
    start: overrides.start ?? new Date(),
    end: overrides.end ?? new Date(Date.now() + 3600000),
    created_at: overrides.created_at ?? new Date(),
    timezone: overrides.timezone ?? 'UTC',
    meeting_type_id:
      overrides.meeting_type_id ?? `meeting-type-${faker.datatype.number()}`,
    meeting_url: overrides.meeting_url ?? 'https://meet.example.com/test',
    participants,
    changes: overrides.changes ?? {
      dateChange: {
        oldStart: new Date(Date.now() - 86400000),
        oldEnd: new Date(Date.now() - 82800000),
      },
    },
    title: overrides.title ?? 'Test Meeting',
    content: overrides.content ?? 'Meeting content',
    meetingProvider: overrides.meetingProvider ?? MeetingProvider.GOOGLE_MEET,
    meetingReminders: overrides.meetingReminders ?? [
      MeetingReminders['15_MINUTES_BEFORE'],
    ],
    meetingPermissions: overrides.meetingPermissions ?? [
      MeetingPermissions.INVITE_GUESTS,
      MeetingPermissions.EDIT_MEETING,
      MeetingPermissions.SCHEDULE_MEETING,
      MeetingPermissions.SEE_GUEST_LIST,
    ],
    rrule: overrides.rrule ?? ['RRULE:FREQ=DAILY;COUNT=5'],
    ical_uid: overrides.ical_uid ?? `ical-${randomUUID()}`,
    calendar_organizer_address:
      overrides.calendar_organizer_address ?? faker.finance.ethereumAddress(),
    isDeleteEvent: overrides.isDeleteEvent ?? false,
    ...overrides,
  }
}

export const mockAccountNotifications = (
  overrides: Partial<AccountNotifications> = {}
): AccountNotifications => ({
  account_address: overrides.account_address ?? faker.finance.ethereumAddress(),
  notification_types: overrides.notification_types ?? [
    {
      channel: NotificationChannel.EMAIL,
      destination: faker.internet.email(),
      disabled: false,
    },
  ],
  ...overrides,
})

export const mockParticipantInfoForNotification = (
  overrides: Partial<ParticipantInfoForNotification> = {}
): ParticipantInfoForNotification => {
  const account_address =
    overrides.account_address ?? faker.finance.ethereumAddress()
  const base: ParticipantInfoForNotification = {
    account_address,
    meeting_id: overrides.meeting_id ?? randomUUID(),
    status: overrides.status ?? ParticipationStatus.Accepted,
    type: overrides.type ?? ParticipantType.Invitee,
    name: overrides.name ?? faker.name.firstName(),
    timezone: overrides.timezone ?? 'UTC',
    mappingType: overrides.mappingType ?? ParticipantMappingType.KEEP,
    notifications:
      overrides.notifications ?? mockAccountNotifications({ account_address }),
  }

  return {
    ...base,
    ...overrides,
    notifications: overrides.notifications ?? base.notifications,
  }
}

export const mockMeetingCancelSyncRequest = (
  overrides: Partial<MeetingCancelSyncRequest> = {}
): MeetingCancelSyncRequest => {
  const meeting_id = overrides.meeting_id ?? randomUUID()

  return {
    participantActing: overrides.participantActing ?? {
      account_address: faker.finance.ethereumAddress(),
      name: faker.name.firstName(),
      guest_email: faker.internet.email(),
    },
    meeting_id,
    start: overrides.start ?? new Date(),
    end: overrides.end ?? new Date(Date.now() + 3600000),
    created_at: overrides.created_at ?? new Date(),
    timezone: overrides.timezone ?? 'UTC',
    meeting_type_id:
      overrides.meeting_type_id ?? `meeting-type-${faker.datatype.number()}`,
    addressesToRemove: overrides.addressesToRemove ?? [
      faker.finance.ethereumAddress(),
    ],
    guestsToRemove: overrides.guestsToRemove ?? [
      {
        meeting_id,
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
        name: faker.name.firstName(),
        guest_email: faker.internet.email(),
      } as ParticipantInfo,
    ],
    reason: overrides.reason ?? 'Cancelled by host',
    title: overrides.title ?? 'Test Meeting',
    ical_uid: overrides.ical_uid ?? `ical-${randomUUID()}`,
    ...overrides,
  }
}

export const mockGroup = (overrides: Partial<Group> = {}): Group => ({
  id: overrides.id ?? randomUUID(),
  name: overrides.name ?? 'Test Group',
  slug: overrides.slug ?? `group-${faker.datatype.number()}`,
  description: overrides.description ?? 'Test Description',
  avatar_url: overrides.avatar_url ?? null,
  ...overrides,
})

export const mockParticipantInfoForInviteNotification = (
  overrides: Partial<ParticipantInfoForInviteNotification> = {}
): ParticipantInfoForInviteNotification => {
  const account_address =
    overrides.account_address ?? faker.finance.ethereumAddress()

  return {
    account_address,
    name: overrides.name ?? faker.name.firstName(),
    guest_email: overrides.guest_email,
    timezone: overrides.timezone ?? 'UTC',
    notifications:
      overrides.notifications ?? mockAccountNotifications({ account_address }),
    ...overrides,
  }
}

export const mockBillingEmailAccountInfo = (
  overrides: Partial<BillingEmailAccountInfo> = {}
): BillingEmailAccountInfo => ({
  email: overrides.email ?? faker.internet.email(),
  displayName: overrides.displayName ?? faker.name.firstName(),
  ...overrides,
})

export const mockBillingEmailPlan = (
  overrides: Partial<BillingEmailPlan> = {}
): BillingEmailPlan => ({
  id: overrides.id ?? randomUUID(),
  name: overrides.name ?? 'Pro Plan',
  price: overrides.price ?? 29.99,
  billing_cycle: overrides.billing_cycle ?? 'month',
  ...overrides,
})

export const mockBillingEmailPeriod = (
  overrides: Partial<BillingEmailPeriod> = {}
): BillingEmailPeriod => ({
  registered_at: overrides.registered_at ?? new Date(),
  expiry_time:
    overrides.expiry_time ?? new Date(Date.now() + 30 * 24 * 3600000),
  ...overrides,
})

export const mockInvoiceMetadata = (
  overrides: Partial<InvoiceMetadata> = {}
): InvoiceMetadata => ({
  full_name: overrides.full_name ?? faker.name.findName(),
  email_address: overrides.email_address ?? faker.internet.email(),
  plan: overrides.plan ?? 'Pro Plan',
  number_of_sessions: overrides.number_of_sessions ?? '1',
  price: overrides.price ?? '29.99',
  payment_method: overrides.payment_method ?? 'stripe',
  url: overrides.url ?? 'https://example.com/invoice.pdf',
  ...overrides,
})

export const mockReceiptMetadata = (
  overrides: Partial<ReceiptMetadata> = {}
): ReceiptMetadata => ({
  ...mockInvoiceMetadata(overrides),
  transaction_fee: overrides.transaction_fee ?? '1.00',
  transaction_status: overrides.transaction_status ?? 'succeeded',
  transaction_hash:
    overrides.transaction_hash ?? faker.datatype.hexadecimal(64),
})

export const mockUnifiedAttendee = (
  overrides: Partial<UnifiedAttendee> = {}
): UnifiedAttendee => ({
  email: overrides.email ?? faker.internet.email(),
  name: 'name' in overrides ? overrides.name! : faker.name.firstName(),
  status: overrides.status ?? AttendeeStatus.ACCEPTED,
  isOrganizer: overrides.isOrganizer ?? false,
  providerData: overrides.providerData ?? { webdav: {} },
})

export const mockWebDAVEventExtensions = (
  overrides: Partial<WebDAVEventExtensions> = {}
): WebDAVEventExtensions => ({
  url: overrides.url ?? 'https://caldav.server.com/event123',
  sequence: overrides.sequence ?? 1,
  duration: overrides.duration ?? { hours: 1 },
  organizer: overrides.organizer ?? faker.internet.email(),
  recurrenceId: overrides.recurrenceId ?? null,
  rrule: overrides.rrule ?? null,
  timezone: overrides.timezone ?? 'UTC',
})

export const mockUnifiedEvent = (
  overrides: Partial<UnifiedEvent> = {}
): UnifiedEvent => ({
  id: overrides.id ?? randomUUID(),
  sourceEventId: overrides.sourceEventId ?? `event-${randomUUID()}`,
  title: overrides.title ?? 'Test Meeting',
  description: overrides.description ?? null,
  start: overrides.start ?? new Date(),
  end: overrides.end ?? new Date(Date.now() + 3600000),
  isAllDay: overrides.isAllDay ?? false,
  calendarId: overrides.calendarId ?? `cal-${randomUUID()}`,
  calendarName: overrides.calendarName ?? 'Test Calendar',
  accountEmail: overrides.accountEmail ?? faker.internet.email(),
  source: overrides.source ?? TimeSlotSource.WEBDAV,
  status: overrides.status ?? EventStatus.CONFIRMED,
  attendees: overrides.attendees ?? [],
  permissions: overrides.permissions ?? [],
  lastModified: overrides.lastModified ?? new Date(),
  isReadOnlyCalendar: overrides.isReadOnlyCalendar ?? false,
  providerData: overrides.providerData ?? {
    webdav: mockWebDAVEventExtensions(),
  },
  ...overrides,
})

export const mockWebDAVEvent = (
  overrides: Partial<WebDAVEvent> = {}
): WebDAVEvent => ({
  uid: overrides.uid ?? `webdav-${randomUUID()}`,
  url: overrides.url ?? 'https://caldav.server.com/event123',
  summary: overrides.summary ?? 'Test WebDAV Event',
  startDate: overrides.startDate ?? new Date(),
  endDate: overrides.endDate ?? new Date(Date.now() + 3600000),
  recurrenceId: overrides.recurrenceId ?? null,
  rrule: overrides.rrule ?? null,
  ...overrides,
})
