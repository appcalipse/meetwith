import { sanitizeParticipants } from '@/utils/calendar_manager'
import { ParticipantInfo, ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'

describe('Calendar Manager Execution Tests', () => {
  describe('sanitizeParticipants', () => {
    it('executes with empty array', () => {
      const result = sanitizeParticipants([])
      expect(result).toEqual([])
    })

    it('executes with single participant', () => {
      const participants: ParticipantInfo[] = [{
        account_address: '0x123',
        type: ParticipantType.Attendee,
        status: ParticipationStatus.Accepted,
      }]
      const result = sanitizeParticipants(participants)
      expect(result).toHaveLength(1)
    })

    it('executes with duplicate addresses', () => {
      const participants: ParticipantInfo[] = [
        { account_address: '0x123', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
        { account_address: '0x123', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result).toHaveLength(1)
    })

    it('executes with scheduler preference', () => {
      const participants: ParticipantInfo[] = [
        { account_address: '0x123', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
        { account_address: '0x123', type: ParticipantType.Scheduler, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result[0].type).toBe(ParticipantType.Scheduler)
    })

    it('executes with guest emails', () => {
      const participants: ParticipantInfo[] = [
        { guest_email: 'guest@example.com', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result).toHaveLength(1)
    })

    it('executes with duplicate emails', () => {
      const participants: ParticipantInfo[] = [
        { guest_email: 'guest@example.com', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
        { guest_email: 'guest@example.com', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result).toHaveLength(1)
    })

    it('executes with mixed participants', () => {
      const participants: ParticipantInfo[] = [
        { account_address: '0x123', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
        { guest_email: 'guest@example.com', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result).toHaveLength(2)
    })

    it('executes case insensitive', () => {
      const participants: ParticipantInfo[] = [
        { account_address: '0x123ABC', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
        { account_address: '0x123abc', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result).toHaveLength(1)
    })

    it('executes with named participants', () => {
      const participants: ParticipantInfo[] = [
        { account_address: '0x123', name: 'User One', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
        { account_address: '0x123', type: ParticipantType.Attendee, status: ParticipationStatus.Accepted },
      ]
      const result = sanitizeParticipants(participants)
      expect(result[0].name).toBe('User One')
    })

    it('executes with many participants', () => {
      const participants: ParticipantInfo[] = Array.from({ length: 100 }, (_, i) => ({
        account_address: `0x${i}`,
        type: ParticipantType.Attendee,
        status: ParticipationStatus.Accepted,
      }))
      const result = sanitizeParticipants(participants)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
