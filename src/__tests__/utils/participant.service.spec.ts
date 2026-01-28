import { ParticipantType } from '@/types/ParticipantInfo'

import { NO_GROUP_KEY } from '@/utils/constants/group'

// Mock user_manager to avoid thirdweb client issues
jest.mock('@/utils/user_manager', () => ({
  ellipsizeAddress: (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  },
}))

import ParticipantService from '@/utils/participant.service'

describe('participant.service', () => {
  describe('computeParticipantChanges', () => {
    it('should identify added participants', () => {
      const current = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]
      const updated = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
        { account_address: '0x456', name: 'Bob', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const result = service.handleParticipantUpdate([])

      expect(result).toHaveLength(2)
      expect(result.some(p => p.account_address === '0x456')).toBe(true)
    })

    it('should identify removed participants', () => {
      const current = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
        { account_address: '0x456', name: 'Bob', type: ParticipantType.Invitee },
      ]
      const updated = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const prev = [...current]
      const result = service.handleParticipantUpdate(prev)

      expect(result).toHaveLength(1)
      expect(result[0].account_address).toBe('0x123')
    })

    it('should handle participants with guest_email', () => {
      const current = [
        { guest_email: 'alice@example.com', name: 'Alice', type: ParticipantType.Invitee },
      ]
      const updated = [
        { guest_email: 'alice@example.com', name: 'Alice', type: ParticipantType.Invitee },
        { guest_email: 'bob@example.com', name: 'Bob', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const result = service.handleParticipantUpdate(current)

      expect(result).toHaveLength(2)
      expect(result.some(p => p.guest_email === 'bob@example.com')).toBe(true)
    })

    it('should be case-insensitive for addresses', () => {
      const current = [
        { account_address: '0xABC', name: 'Alice', type: ParticipantType.Invitee },
      ]
      const updated = [
        { account_address: '0xabc', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const result = service.handleParticipantUpdate([...current])

      expect(result).toHaveLength(1)
    })
  })

  describe('handleDerivatives', () => {
    it('should add new participants to NO_GROUP_KEY', () => {
      const current: any[] = []
      const updated = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const result = service.handleDerivatives({})

      expect(result[NO_GROUP_KEY]).toContain('0x123')
    })

    it('should remove participants from derivatives', () => {
      const current = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]
      const updated: any[] = []

      const service = new ParticipantService(current, updated)
      const prev = { [NO_GROUP_KEY]: ['0x123'] }
      const result = service.handleDerivatives(prev)

      expect(result[NO_GROUP_KEY]).toEqual([])
    })

    it('should handle multiple groups', () => {
      const current: any[] = []
      const updated = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const prev = {
        group1: ['0x456'],
        group2: ['0x789'],
      }
      const result = service.handleDerivatives(prev)

      expect(result.group1).toEqual(['0x456'])
      expect(result.group2).toEqual(['0x789'])
      expect(result[NO_GROUP_KEY]).toContain('0x123')
    })

    it('should not duplicate addresses', () => {
      const current: any[] = []
      const updated = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const prev = { [NO_GROUP_KEY]: ['0x123'] }
      const result = service.handleDerivatives(prev)

      expect(result[NO_GROUP_KEY]).toEqual(['0x123'])
    })

    it('should be case-insensitive', () => {
      const current: any[] = []
      const updated = [
        { account_address: '0xABC', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const result = service.handleDerivatives({})

      expect(result[NO_GROUP_KEY]).toContain('0xabc')
    })
  })

  describe('handleParticipantUpdate', () => {
    it('should preserve group participants', () => {
      const current = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]
      const updated: any[] = []

      const service = new ParticipantService(current, updated)
      const prev = [
        { name: 'Group A', members: [] } as any,
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]
      const result = service.handleParticipantUpdate(prev)

      expect(result.some(p => 'members' in p)).toBe(true)
    })

    it('should deduplicate participants', () => {
      const current: any[] = []
      const updated = [
        { account_address: '0x123', name: 'Alice', type: ParticipantType.Invitee },
      ]

      const service = new ParticipantService(current, updated)
      const result = service.handleParticipantUpdate([])

      expect(result).toHaveLength(1)
    })
  })

  describe('renderParticipantChipLabel', () => {
    it('should render group name for group participants', () => {
      const participant = { name: 'Team A', members: [] } as any
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toBe('Team A')
    })

    it('should render "You (Scheduler)" for current user who is scheduler', () => {
      const participant = {
        account_address: '0x123',
        name: 'Alice',
        type: ParticipantType.Scheduler,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toBe('You (Scheduler)')
    })

    it('should render name with "(Scheduler)" for other schedulers', () => {
      const participant = {
        account_address: '0x456',
        name: 'Bob',
        type: ParticipantType.Scheduler,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toBe('Bob (Scheduler)')
    })

    it('should render email with "(Scheduler)" for scheduler without name', () => {
      const participant = {
        account_address: '0x456',
        guest_email: 'bob@example.com',
        type: ParticipantType.Scheduler,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toBe('bob@example.com (Scheduler)')
    })

    it('should render name for regular invitees', () => {
      const participant = {
        account_address: '0x456',
        name: 'Bob',
        type: ParticipantType.Invitee,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toBe('Bob')
    })

    it('should render guest_email when no name', () => {
      const participant = {
        guest_email: 'bob@example.com',
        type: ParticipantType.Invitee,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toBe('bob@example.com')
    })

    it('should render ellipsized address when no name or email', () => {
      const participant = {
        account_address: '0x1234567890abcdef1234567890abcdef12345678',
        type: ParticipantType.Invitee,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0x123'
      )

      expect(label).toMatch(/0x.*\.\.\..*/)
    })

    it('should be case-insensitive for current user check', () => {
      const participant = {
        account_address: '0xABC',
        name: 'Alice',
        type: ParticipantType.Scheduler,
      }
      const label = ParticipantService.renderParticipantChipLabel(
        participant,
        '0xabc'
      )

      expect(label).toBe('You (Scheduler)')
    })
  })
})
