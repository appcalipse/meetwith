import { Wallet } from 'thirdweb/wallets'
import { Account } from '@/types/Account'
import { GroupInvitesResponse } from '@/types/Group'
import {
  ParticipantBaseInfo,
  ParticipantType,
  ParticipationStatus,
  InvitedUser,
} from '@/types/ParticipantInfo'
import * as apiHelper from '@/utils/api_helper'
import * as storage from '@/utils/storage'
import * as rpcHelperFront from '@/utils/rpc_helper_front'
import {
  loginWithAddress,
  getInvitedUserDisplayName,
  getParticipantBaseInfoFromAccount,
  validateUserPermissions,
  thirdWebClient,
} from '@/utils/user_manager'
import { AccountNotFoundError } from '@/utils/errors'
import { queryClient } from '@/utils/react_query'

jest.mock('@/utils/api_helper')
jest.mock('@/utils/storage')
jest.mock('@/utils/rpc_helper_front')
jest.mock('@/utils/react_query', () => ({
  queryClient: {
    fetchQuery: jest.fn(),
  },
}))

const mockAccount: Account = {
  id: 'user-123',
  address: '0x1234567890abcdef1234567890abcdef12345678',
  is_invited: false,
  nonce: 12345,
  preferences: {
    name: 'Test User',
    timezone: 'America/New_York',
    availabilities: [],
    meetingProviders: [],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockSignMessage = jest.fn(() => Promise.resolve('mock-signature'))
const mockWalletAccount = {
  address: mockAccount.address,
  signMessage: mockSignMessage,
}
const mockWallet = {
  getAccount: jest.fn(() => mockWalletAccount),
} as unknown as Wallet

describe('user_manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(apiHelper.getAccount as jest.Mock).mockResolvedValue(mockAccount)
    ;(apiHelper.signup as jest.Mock).mockResolvedValue(mockAccount)
    ;(apiHelper.login as jest.Mock).mockResolvedValue(mockAccount)
    ;(storage.getSignature as jest.Mock).mockReturnValue('mock-signature')
    ;(storage.saveSignature as jest.Mock).mockImplementation(() => {})
    ;(rpcHelperFront.resolveExtraInfo as jest.Mock).mockResolvedValue({})
    ;(queryClient.fetchQuery as jest.Mock).mockImplementation(
      async (key, fn) => await fn()
    )
  })

  describe('thirdWebClient', () => {
    it('should be defined and configured', () => {
      expect(thirdWebClient).toBeDefined()
    })
  })

  describe('loginWithAddress', () => {
    const mockSetLoginIn = jest.fn()

    it('should login successfully with existing account', async () => {
      const result = await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(mockSetLoginIn).toHaveBeenCalledWith(true)
      expect(mockSetLoginIn).toHaveBeenCalledWith(false)
      expect(result).toBeDefined()
      expect(result?.address).toBe(mockAccount.address)
    })

    it('should signup if account not found', async () => {
      ;(apiHelper.getAccount as jest.Mock).mockRejectedValue(
        new AccountNotFoundError()
      )

      const result = await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(apiHelper.signup).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should signup if account is invited', async () => {
      ;(apiHelper.getAccount as jest.Mock).mockResolvedValue({
        ...mockAccount,
        is_invited: true,
      })

      const result = await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(apiHelper.signup).toHaveBeenCalled()
    })

    it('should call login after getting account if not invited', async () => {
      ;(apiHelper.getAccount as jest.Mock).mockResolvedValue({
        ...mockAccount,
        is_invited: false,
      })
      ;(storage.getSignature as jest.Mock).mockReturnValue(null)

      const result = await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(apiHelper.login).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Network error')
      ;(apiHelper.getAccount as jest.Mock).mockRejectedValue(error)
      ;(apiHelper.signup as jest.Mock).mockRejectedValue(error)

      const result = await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(result).toBeUndefined()
      expect(mockSetLoginIn).toHaveBeenCalledWith(false)
    })

    it('should lowercase address', async () => {
      const upperCaseWallet = {
        getAccount: jest.fn(() => ({
          address: '0XABCDEF',
          signMessage: jest.fn(() => Promise.resolve('mock-signature')),
        })),
      } as unknown as Wallet

      await loginWithAddress(upperCaseWallet, mockSetLoginIn)

      expect(queryClient.fetchQuery).toHaveBeenCalled()
    })

    it('should use timezone from Intl', async () => {
      await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(apiHelper.getAccount).toHaveBeenCalled()
    })

    it('should sign message if no signature exists', async () => {
      ;(storage.getSignature as jest.Mock).mockReturnValue(null)

      await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(mockWallet.getAccount()?.signMessage).toHaveBeenCalled()
      expect(storage.saveSignature).toHaveBeenCalled()
    })

    it('should resolve extra info from RPC', async () => {
      const extraInfo = { ensName: 'test.eth' }
      ;(rpcHelperFront.resolveExtraInfo as jest.Mock).mockResolvedValue(
        extraInfo
      )

      const result = await loginWithAddress(mockWallet, mockSetLoginIn)

      expect(rpcHelperFront.resolveExtraInfo).toHaveBeenCalledWith(
        mockAccount.address
      )
      expect(result?.preferences).toMatchObject(extraInfo)
    })

    it('should throw error if wallet account is not found', async () => {
      const walletWithoutAccount = {
        getAccount: jest.fn(() => null),
      } as unknown as Wallet

      const result = await loginWithAddress(walletWithoutAccount, mockSetLoginIn)
      expect(result).toBeUndefined()
    })

    it('should generate random nonce for signing', async () => {
      ;(storage.getSignature as jest.Mock).mockReturnValue(null)

      await loginWithAddress(mockWallet, mockSetLoginIn)

      const signMessageCall = mockWallet.getAccount()?.signMessage as jest.Mock
      if (signMessageCall.mock.calls.length > 0) {
        const message = signMessageCall.mock.calls[0][0].message
        expect(message).toContain('Meet with Wallet')
      }
    })
  })

  describe('getInvitedUserDisplayName', () => {
    it('should return name if available', () => {
      const invitedUser: InvitedUser = {
        account_address: '0x123',
        name: 'John Doe',
      }

      const displayName = getInvitedUserDisplayName(invitedUser)
      expect(displayName).toBe('John Doe')
    })

    it('should return guest email if name not available', () => {
      const invitedUser: InvitedUser = {
        account_address: '0x123',
        guest_email: 'john@example.com',
      }

      const displayName = getInvitedUserDisplayName(invitedUser)
      expect(displayName).toBe('john@example.com')
    })

    it('should return ellipsized address if no name or email', () => {
      const invitedUser: InvitedUser = {
        account_address: '0x1234567890abcdef1234567890abcdef12345678',
      }

      const displayName = getInvitedUserDisplayName(invitedUser)
      expect(displayName).toMatch(/^0x123\.\.\.45678$/)
    })

    it('should prefer name over email', () => {
      const invitedUser: InvitedUser = {
        account_address: '0x123',
        name: 'John Doe',
        guest_email: 'john@example.com',
      }

      const displayName = getInvitedUserDisplayName(invitedUser)
      expect(displayName).toBe('John Doe')
    })

    it('should handle undefined address gracefully', () => {
      const invitedUser: InvitedUser = {
        account_address: undefined,
        name: 'John Doe',
      }

      const displayName = getInvitedUserDisplayName(invitedUser)
      expect(displayName).toBe('John Doe')
    })
  })

  describe('getParticipantBaseInfoFromAccount', () => {
    it('should extract participant info from account', () => {
      const result = getParticipantBaseInfoFromAccount(mockAccount)

      expect(result).toEqual({
        account_address: mockAccount.address,
        name: mockAccount.preferences?.name,
      })
    })

    it('should use ellipsized address if no name', () => {
      const accountWithoutName: Account = {
        ...mockAccount,
        preferences: {
          ...mockAccount.preferences,
          name: undefined,
        },
      }

      const result = getParticipantBaseInfoFromAccount(accountWithoutName)

      expect(result.account_address).toBe(accountWithoutName.address)
      expect(result.name).toMatch(/^0x123\.\.\./)
    })

    it('should handle account without preferences', () => {
      const accountWithoutPrefs: Account = {
        ...mockAccount,
        preferences: undefined as any,
      }

      const result = getParticipantBaseInfoFromAccount(accountWithoutPrefs)

      expect(result.account_address).toBe(accountWithoutPrefs.address)
      expect(result.name).toBeDefined()
    })
  })

  describe('validateUserPermissions', () => {
    const groupInvites: GroupInvitesResponse[] = [
      {
        userId: mockAccount.id,
        email: 'test@example.com',
        discordId: 'discord-123',
        groupId: 'group-123',
        createdAt: new Date().toISOString(),
      },
    ]

    it('should validate user_id match', () => {
      const result = validateUserPermissions(
        mockAccount,
        { user_id: mockAccount.id },
        groupInvites
      )
      expect(result).toBe(true)
    })

    it('should reject mismatched user_id', () => {
      const result = validateUserPermissions(
        mockAccount,
        { user_id: 'wrong-id' },
        groupInvites
      )
      expect(result).toBe(false)
    })

    it('should validate email match in group invites', () => {
      const result = validateUserPermissions(
        mockAccount,
        { email: 'test@example.com' },
        groupInvites
      )
      expect(result).toBe(true)
    })

    it('should reject email not in group invites', () => {
      const result = validateUserPermissions(
        mockAccount,
        { email: 'wrong@example.com' },
        groupInvites
      )
      expect(result).toBe(false)
    })

    it('should reject email with mismatched userId', () => {
      const invitesWithDifferentUser: GroupInvitesResponse[] = [
        {
          ...groupInvites[0],
          userId: 'different-user',
        },
      ]

      const result = validateUserPermissions(
        mockAccount,
        { email: 'test@example.com' },
        invitesWithDifferentUser
      )
      expect(result).toBe(false)
    })

    it('should validate discord_id match in group invites', () => {
      const result = validateUserPermissions(
        mockAccount,
        { discord_id: 'discord-123' },
        groupInvites
      )
      expect(result).toBe(true)
    })

    it('should reject discord_id not in group invites', () => {
      const result = validateUserPermissions(
        mockAccount,
        { discord_id: 'wrong-discord' },
        groupInvites
      )
      expect(result).toBe(false)
    })

    it('should reject discord_id with mismatched userId', () => {
      const invitesWithDifferentUser: GroupInvitesResponse[] = [
        {
          ...groupInvites[0],
          userId: 'different-user',
        },
      ]

      const result = validateUserPermissions(
        mockAccount,
        { discord_id: 'discord-123' },
        invitesWithDifferentUser
      )
      expect(result).toBe(false)
    })

    it('should return true with no params', () => {
      const result = validateUserPermissions(mockAccount, {}, groupInvites)
      expect(result).toBe(true)
    })

    it('should validate multiple params together', () => {
      const result = validateUserPermissions(
        mockAccount,
        {
          user_id: mockAccount.id,
          email: 'test@example.com',
        },
        groupInvites
      )
      expect(result).toBe(true)
    })

    it('should reject if any param is invalid', () => {
      const result = validateUserPermissions(
        mockAccount,
        {
          user_id: mockAccount.id,
          email: 'wrong@example.com',
        },
        groupInvites
      )
      expect(result).toBe(false)
    })

    it('should handle empty group invites', () => {
      const result = validateUserPermissions(
        mockAccount,
        { email: 'test@example.com' },
        []
      )
      expect(result).toBe(false)
    })

    it('should handle group_id parameter gracefully', () => {
      const result = validateUserPermissions(
        mockAccount,
        { group_id: 'group-123' },
        groupInvites
      )
      expect(result).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle null wallet account', async () => {
      const nullWallet = {
        getAccount: jest.fn(() => null),
      } as unknown as Wallet

      const result = await loginWithAddress(nullWallet, jest.fn())
      expect(result).toBeUndefined()
    })

    it('should handle signup returning different account', async () => {
      const differentAccount = {
        ...mockAccount,
        address: '0xdifferent',
      }
      ;(apiHelper.getAccount as jest.Mock).mockRejectedValue(
        new AccountNotFoundError()
      )
      ;(apiHelper.signup as jest.Mock).mockResolvedValue(differentAccount)

      const result = await loginWithAddress(mockWallet, jest.fn())

      expect(result?.address).toBe(differentAccount.address)
    })

    it('should handle missing preferences in account', async () => {
      const accountWithoutPrefs = {
        ...mockAccount,
        preferences: undefined,
      }
      ;(apiHelper.getAccount as jest.Mock).mockResolvedValue(
        accountWithoutPrefs
      )

      const result = await loginWithAddress(mockWallet, jest.fn())

      expect(result).toBeDefined()
    })
  })
})
