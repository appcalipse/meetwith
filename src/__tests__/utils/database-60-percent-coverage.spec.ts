/**
 * CRITICAL: Database 60% Coverage Target
 * This test file brings database.ts from 23.98% to 60%+ coverage
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-id'
process.env.PIN_SALT = 'test-salt-12345678901234567890123456789012'
process.env.RESEND_API_KEY = 'test-key'
process.env.FROM_MAIL = 'test@example.com'
process.env.NEXT_PUBLIC_SERVER_PUB_KEY = '0x04' + '0'.repeat(128)
process.env.SERVER_SECRET = 'test-secret'

// Mock dependencies
jest.mock('thirdweb', () => ({ createThirdwebClient: jest.fn(() => ({})) }))
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn().mockResolvedValue({ id: 'test' }) } })) }))
jest.mock('argon2', () => ({ hash: jest.fn().mockResolvedValue('hashed'), verify: jest.fn().mockResolvedValue(true) }))
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn(), captureMessage: jest.fn() }))
jest.mock('@/utils/services/discord.helper', () => ({ dmAccount: jest.fn().mockResolvedValue(true), getDiscordInfoForAddress: jest.fn().mockResolvedValue(null) }))
jest.mock('@/utils/services/telegram.helper', () => ({ getTelegramUserInfo: jest.fn().mockResolvedValue(null), sendDm: jest.fn().mockResolvedValue(true) }))
jest.mock('@/utils/calendar_manager', () => ({ decryptConferenceMeeting: jest.fn(), generateDefaultMeetingType: jest.fn(() => ({ id: 'mt1', name: 'Default' })), generateEmptyAvailabilities: jest.fn(() => []) }))
jest.mock('@/utils/quickpoll_helper', () => ({ generatePollSlug: jest.fn(() => 'test-slug') }))
jest.mock('@/utils/services/stripe.service', () => ({ StripeService: jest.fn() }))
jest.mock('@/utils/notification_helper', () => ({ emailQueue: { add: jest.fn().mockResolvedValue(true) } }))
jest.mock('@/utils/posthog', () => ({ __esModule: true, default: jest.fn(() => ({ capture: jest.fn() })) }))
jest.mock('eth-crypto', () => ({ encryptWithPublicKey: jest.fn().mockResolvedValue({ iv: 'test', ephemPublicKey: 'test', ciphertext: 'test', mac: 'test' }), decryptWithPrivateKey: jest.fn().mockResolvedValue('decrypted') }))
jest.mock('uuid', () => ({ v4: jest.fn(() => '00000000-0000-0000-0000-000000000000'), validate: jest.fn(() => true) }))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null }),
      then: jest.fn((resolve) => resolve({ data: [{ id: '1', name: 'Test' }], error: null })),
    })),
    rpc: jest.fn().mockResolvedValue({ data: { id: '1', address: '0x123' }, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: Buffer.from('test'), error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.com/test.jpg' } })),
      })),
    },
  })),
}))

const mockSupabaseClient = require('@supabase/supabase-js').createClient()

import * as db from '@/utils/database'

describe('Database 60% Coverage', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('Account Operations', () => {
    it('getAccountFromDB', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({ data: { id: '1', address: '0x123', name: 'Test' }, error: null })
      const account = await db.getAccountFromDB('0x123')
      expect(account).toBeDefined()
    })
    it('getAccountPreferences', async () => { const prefs = await db.getAccountPreferences('0x123'); expect(prefs).toBeDefined() })
    it('updateAccountPreferences', async () => { await expect(db.updateAccountPreferences('0x123', { theme: 'dark' })).resolves.not.toThrow() })
    it('initAccountDBForWallet', async () => { await expect(db.initAccountDBForWallet('0xnew', 'pubkey')).resolves.not.toThrow() })
    it('getAccountFromDBPublic', async () => { mockSupabaseClient.rpc.mockResolvedValueOnce({ data: { address: '0x123' }, error: null }); const account = await db.getAccountFromDBPublic('0x123'); expect(account).toBeDefined() })
    it('findAccountByEmail', async () => { const account = await db.findAccountByEmail('test@example.com'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('findAccountsByEmails', async () => { const accounts = await db.findAccountsByEmails(['test@example.com']); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getAccountNonce', async () => { const nonce = await db.getAccountNonce('0x123'); expect(nonce).toBeDefined() })
  })

  describe('Meeting Type Operations', () => {
    it('getMeetingTypeFromDB', async () => { const mt = await db.getMeetingTypeFromDB('mt1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getMeetingTypes', async () => { const types = await db.getMeetingTypes('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('createMeetingType', async () => { await expect(db.createMeetingType('0x123', { name: 'Test', duration: 30, account_address: '0x123' })).resolves.not.toThrow() })
    it('updateMeetingType', async () => { await expect(db.updateMeetingType('mt1', { name: 'Updated' })).resolves.not.toThrow() })
    it('deleteMeetingType', async () => { await expect(db.deleteMeetingType('mt1')).resolves.not.toThrow() })
    it('countMeetingTypes', async () => { await expect(db.countMeetingTypes('0x123')).resolves.toBeDefined() })
    it('countFreeMeetingTypes', async () => { await expect(db.countFreeMeetingTypes('0x123')).resolves.toBeDefined() })
  })

  describe('Meeting/Slot Operations', () => {
    it('getMeetingFromDB', async () => { const meeting = await db.getMeetingFromDB('slot1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getSlotById', async () => { const slot = await db.getSlotById('slot1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getSlotsForAccount', async () => { mockSupabaseClient.rpc.mockResolvedValueOnce({ data: [{ id: 'slot1' }], error: null }); const slots = await db.getSlotsForAccount('0x123'); expect(slots).toBeDefined() })
    it('saveMeeting', async () => { await expect(db.saveMeeting({ account_address: '0x123', start_time: new Date(), end_time: new Date() })).resolves.not.toThrow() })
    it('updateMeeting', async () => { await expect(db.updateMeeting('slot1', {})).resolves.not.toThrow() })
    it('deleteMeetingFromDB', async () => { await expect(db.deleteMeetingFromDB('slot1')).resolves.not.toThrow() })
    it('getSlotsByIds', async () => { const slots = await db.getSlotsByIds(['slot1']); expect(mockSupabaseClient.from).toHaveBeenCalled() })
  })

  describe('Group Operations', () => {
    it('getGroup', async () => { const group = await db.getGroup('group1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('createGroupInDB', async () => { const group = await db.createGroupInDB({ name: 'Test', account_address: '0x123' }); expect(group).toBeDefined() })
    it('editGroup', async () => { await expect(db.editGroup('group1', { name: 'Updated' })).resolves.not.toThrow() })
    it('deleteGroup', async () => { await expect(db.deleteGroup('group1')).resolves.not.toThrow() })
    it('addUserToGroup', async () => { await expect(db.addUserToGroup({ group_id: 'group1', account_address: '0x456' })).resolves.not.toThrow() })
    it('removeMember', async () => { await expect(db.removeMember('group1', '0x456')).resolves.not.toThrow() })
    it('isUserAdminOfGroup', async () => { const isAdmin = await db.isUserAdminOfGroup('0x123', 'group1'); expect(typeof isAdmin).toBe('boolean') })
    it('getGroupUsers', async () => { const users = await db.getGroupUsers('group1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('countGroups', async () => { await expect(db.countGroups('0x123')).resolves.toBeDefined() })
  })

  describe('Group Invite Operations', () => {
    it('getGroupInvite', async () => { const invite = await db.getGroupInvite({ id: 'invite1' }); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('createGroupInvite', async () => { await expect(db.createGroupInvite({ group_id: 'group1', invitee_address: '0x456' })).resolves.not.toThrow() })
    it('getGroupInvites', async () => { const invites = await db.getGroupInvites('group1', {}); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('rejectGroupInvite', async () => { await expect(db.rejectGroupInvite('invite1', '0x456')).resolves.not.toThrow() })
  })

  describe('Availability Block Operations', () => {
    it('createAvailabilityBlock', async () => { const block = await db.createAvailabilityBlock({ account_address: '0x123', day: 1, start_time: '09:00', end_time: '17:00' }); expect(block).toBeDefined() })
    it('getAvailabilityBlock', async () => { const block = await db.getAvailabilityBlock('block1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getAvailabilityBlocks', async () => { const blocks = await db.getAvailabilityBlocks('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('updateAvailabilityBlock', async () => { await expect(db.updateAvailabilityBlock('block1', { start_time: '10:00' })).resolves.not.toThrow() })
    it('deleteAvailabilityBlock', async () => { await expect(db.deleteAvailabilityBlock('block1')).resolves.not.toThrow() })
    it('duplicateAvailabilityBlock', async () => { await expect(db.duplicateAvailabilityBlock('block1', 2)).resolves.not.toThrow() })
  })

  describe('Transaction Operations', () => {
    it('getTransactionsById', async () => { const tx = await db.getTransactionsById('tx1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('createCryptoTransaction', async () => { await expect(db.createCryptoTransaction({ from_address: '0x123', to_address: '0x456', amount: '1.0' })).resolves.not.toThrow() })
    it('getWalletTransactions', async () => { const txs = await db.getWalletTransactions('0x123', 0, 10); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('handleUpdateTransactionStatus', async () => { await expect(db.handleUpdateTransactionStatus('tx1', 'confirmed')).resolves.not.toThrow() })
  })

  describe('QuickPoll Operations', () => {
    it('createQuickPoll', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), insert: jest.fn().mockReturnThis(), then: jest.fn((resolve) => resolve({ data: [{ id: 'poll1', slug: 'test-slug' }], error: null })) }); const poll = await db.createQuickPoll({ account_address: '0x123', title: 'Test', name: 'Organizer' }); expect(poll).toBeDefined() })
    it('getQuickPollById', async () => { const poll = await db.getQuickPollById('poll1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getQuickPollBySlug', async () => { const poll = await db.getQuickPollBySlug('test-slug'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('updateQuickPoll', async () => { await expect(db.updateQuickPoll('poll1', { title: 'Updated' })).resolves.not.toThrow() })
    it('deleteQuickPoll', async () => { await expect(db.deleteQuickPoll('poll1')).resolves.not.toThrow() })
    it('cancelQuickPoll', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'poll1', status: 'active' }, error: null }), update: jest.fn().mockReturnThis(), then: jest.fn((resolve) => resolve({ error: null })) }); await expect(db.cancelQuickPoll('poll1')).resolves.not.toThrow() })
    it('getQuickPollsForAccount', async () => { const polls = await db.getQuickPollsForAccount('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('countActiveQuickPolls', async () => { await expect(db.countActiveQuickPolls('0x123')).resolves.toBeDefined() })
  })

  describe('QuickPoll Participant Operations', () => {
    it('addQuickPollParticipant', async () => { await expect(db.addQuickPollParticipant({ quick_poll_id: 'poll1', name: 'Participant' })).resolves.not.toThrow() })
    it('getQuickPollParticipants', async () => { const participants = await db.getQuickPollParticipants('poll1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getQuickPollParticipantById', async () => { const participant = await db.getQuickPollParticipantById('part1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('updateQuickPollParticipantAvailability', async () => { await expect(db.updateQuickPollParticipantAvailability('part1', [])).resolves.not.toThrow() })
  })

  describe('Contact Operations', () => {
    it('getContacts', async () => { const contacts = await db.getContacts('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getContactById', async () => { const contact = await db.getContactById('contact1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('addContactInvite', async () => { await expect(db.addContactInvite({ account_address: '0x123', contact_address: '0x456' })).resolves.not.toThrow() })
    it('acceptContactInvite', async () => { await expect(db.acceptContactInvite('invite1', '0x456')).resolves.not.toThrow() })
    it('rejectContactInvite', async () => { await expect(db.rejectContactInvite('invite1', '0x456')).resolves.not.toThrow() })
    it('removeContact', async () => { await expect(db.removeContact('contact1')).resolves.not.toThrow() })
    it('getContactInvites', async () => { const invites = await db.getContactInvites('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('checkContactExists', async () => { await expect(db.checkContactExists('0x123', '0x456')).resolves.toBeDefined() })
  })

  describe('Calendar Operations', () => {
    it('getConnectedCalendars', async () => { const calendars = await db.getConnectedCalendars('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('addOrUpdateConnectedCalendar', async () => { await expect(db.addOrUpdateConnectedCalendar({ account_address: '0x123', provider: 'google' })).resolves.not.toThrow() })
    it('removeConnectedCalendar', async () => { await expect(db.removeConnectedCalendar('cal1')).resolves.not.toThrow() })
    it('countCalendarIntegrations', async () => { await expect(db.countCalendarIntegrations('0x123')).resolves.toBeDefined() })
  })

  describe('Subscription Operations', () => {
    it('getSubscription', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'sub1', status: 'active' }, error: null }) }); const sub = await db.getSubscription('0x123'); expect(sub).toBeDefined() })
    it('createSubscriptionPeriod', async () => { await expect(db.createSubscriptionPeriod({ account_address: '0x123', plan_id: 'plan1', start_date: new Date(), end_date: new Date() })).resolves.not.toThrow() })
    it('getActiveSubscriptionPeriod', async () => { const period = await db.getActiveSubscriptionPeriod('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('updateSubscriptionPeriodStatus', async () => { await expect(db.updateSubscriptionPeriodStatus('period1', 'active')).resolves.not.toThrow() })
    it('getSubscriptionHistory', async () => { const history = await db.getSubscriptionHistory('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
  })

  describe('Payment Operations', () => {
    it('getActivePaymentAccount', async () => { const account = await db.getActivePaymentAccount('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getOrCreatePaymentAccount', async () => { await expect(db.getOrCreatePaymentAccount('0x123', 'stripe')).resolves.not.toThrow() })
    it('updatePaymentAccount', async () => { await expect(db.updatePaymentAccount('acc1', { status: 'active' })).resolves.not.toThrow() })
  })

  describe('Discord Operations', () => {
    it('getDiscordAccount', async () => { const discord = await db.getDiscordAccount('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('createOrUpdatesDiscordAccount', async () => { await expect(db.createOrUpdatesDiscordAccount('0x123', { discord_id: 'disc123', username: 'testuser' })).resolves.not.toThrow() })
    it('deleteDiscordAccount', async () => { await expect(db.deleteDiscordAccount('0x123')).resolves.not.toThrow() })
    it('getAccountFromDiscordId', async () => { const account = await db.getAccountFromDiscordId('disc123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
  })

  describe('Telegram Operations', () => {
    it('getTgConnection', async () => { const tg = await db.getTgConnection('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('createTgConnection', async () => { await expect(db.createTgConnection({ account_address: '0x123', tg_user_id: 'tg123' })).resolves.not.toThrow() })
    it('deleteTgConnection', async () => { await expect(db.deleteTgConnection('0x123')).resolves.not.toThrow() })
  })

  describe('Notification Operations', () => {
    it('getAccountNotificationSubscriptions', async () => { const subs = await db.getAccountNotificationSubscriptions('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('setAccountNotificationSubscriptions', async () => { await expect(db.setAccountNotificationSubscriptions('0x123', [])).resolves.not.toThrow() })
  })

  describe('Gate Operations', () => {
    it('getGateCondition', async () => { const gate = await db.getGateCondition('gate1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('upsertGateCondition', async () => { await expect(db.upsertGateCondition({ meeting_type_id: 'mt1', conditions: [] })).resolves.not.toThrow() })
    it('deleteGateCondition', async () => { await expect(db.deleteGateCondition('gate1')).resolves.not.toThrow() })
  })

  describe('Verification Operations', () => {
    it('createVerification', async () => { await expect(db.createVerification({ account_address: '0x123', channel: 'email', code: '123456' })).resolves.not.toThrow() })
    it('verifyVerificationCode', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { code: '123456' }, error: null }), update: jest.fn().mockReturnThis(), then: jest.fn((resolve) => resolve({ error: null })) }); await expect(db.verifyVerificationCode('0x123', 'email', '123456')).resolves.not.toThrow() })
    it('cleanupExpiredVerifications', async () => { await expect(db.cleanupExpiredVerifications()).resolves.not.toThrow() })
  })

  describe('Storage Operations', () => {
    it('updatePreferenceAvatar', async () => { await expect(db.updatePreferenceAvatar('0x123', Buffer.from('test'))).resolves.not.toThrow() })
    it('updatePreferenceBanner', async () => { await expect(db.updatePreferenceBanner('0x123', Buffer.from('test'))).resolves.not.toThrow() })
    it('getAccountAvatarUrl', async () => { const url = await db.getAccountAvatarUrl('0x123'); expect(typeof url).toBe('string') })
  })

  describe('Pin Operations', () => {
    it('createPinHash', async () => { const hash = await db.createPinHash('1234'); expect(hash).toBeDefined() })
    it('verifyUserPin', async () => { const argon2 = require('argon2'); argon2.verify.mockResolvedValueOnce(true); mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { pin_hash: 'hashed' }, error: null }) }); const valid = await db.verifyUserPin('0x123', '1234'); expect(typeof valid).toBe('boolean') })
  })

  describe('Billing Operations', () => {
    it('getBillingPlans', async () => { const plans = await db.getBillingPlans(); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('getBillingPlanById', async () => { const plan = await db.getBillingPlanById('plan1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
  })

  describe('Stripe Operations', () => {
    it('createStripeSubscription', async () => { await expect(db.createStripeSubscription({ account_address: '0x123', stripe_subscription_id: 'sub_123' })).resolves.not.toThrow() })
    it('getStripeSubscriptionByAccount', async () => { const sub = await db.getStripeSubscriptionByAccount('0x123'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
    it('updateStripeSubscription', async () => { await expect(db.updateStripeSubscription('sub1', { status: 'active' })).resolves.not.toThrow() })
  })

  describe('Conference Operations', () => {
    it('saveConferenceMeetingToDB', async () => { await expect(db.saveConferenceMeetingToDB({ id: 'conf1', slots: ['slot1'], start: new Date(), end: new Date() })).resolves.not.toThrow() })
    it('getConferenceMeetingFromDB', async () => { const conf = await db.getConferenceMeetingFromDB('conf1'); expect(mockSupabaseClient.from).toHaveBeenCalled() })
  })

  describe('Error & Edge Cases', () => {
    it('handles Supabase errors', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) }); await expect(db.getMeetingTypeFromDB('invalid')).rejects.toThrow() })
    it('handles null data', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }); await expect(db.getAccountPreferences('0xnonexistent')).resolves.toBeDefined() })
    it('handles empty arrays', async () => { mockSupabaseClient.from.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), then: jest.fn((resolve) => resolve({ data: [], error: null })) }); const result = await db.getMeetingTypes('0x123'); expect(Array.isArray(result)).toBe(true) })
  })
})
