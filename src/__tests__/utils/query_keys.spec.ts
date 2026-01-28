import QueryKeys from '@/utils/query_keys'

describe('query_keys', () => {
  describe('existingAccounts', () => {
    it('should return query key with sorted addresses', () => {
      const result = QueryKeys.existingAccounts(['0xabc', '0xdef'], true)
      expect(result).toEqual(['existingAccounts', ['0xabc', '0xdef'], true])
    })

    it('should sort addresses', () => {
      const result = QueryKeys.existingAccounts(['0xdef', '0xabc'], false)
      expect(result).toEqual(['existingAccounts', ['0xabc', '0xdef'], false])
    })

    it('should handle empty array', () => {
      const result = QueryKeys.existingAccounts([], true)
      expect(result).toEqual(['existingAccounts', [], true])
    })
  })

  describe('connectedCalendars', () => {
    it('should return query key without syncOnly', () => {
      const result = QueryKeys.connectedCalendars()
      expect(result).toEqual(['connectedCalendars', false])
    })

    it('should return query key with syncOnly true', () => {
      const result = QueryKeys.connectedCalendars(true)
      expect(result).toEqual(['connectedCalendars', true])
    })

    it('should return query key with syncOnly false', () => {
      const result = QueryKeys.connectedCalendars(false)
      expect(result).toEqual(['connectedCalendars', false])
    })
  })

  describe('meetingsByAccount', () => {
    it('should return query key with account', () => {
      const result = QueryKeys.meetingsByAccount('0x123')
      expect(result).toEqual(['meetingsByAccount', '0x123'])
    })

    it('should return query key without account', () => {
      const result = QueryKeys.meetingsByAccount()
      expect(result).toEqual(['meetingsByAccount', undefined])
    })
  })

  describe('meeting', () => {
    it('should return query key with slot_id', () => {
      const result = QueryKeys.meeting('slot-123')
      expect(result).toEqual(['meeting', 'slot-123'])
    })

    it('should return query key without slot_id', () => {
      const result = QueryKeys.meeting()
      expect(result).toEqual(['meeting', undefined])
    })
  })

  describe('account', () => {
    it('should return query key with id', () => {
      const result = QueryKeys.account('account-123')
      expect(result).toEqual(['account', 'account-123'])
    })

    it('should return query key without id', () => {
      const result = QueryKeys.account()
      expect(result).toEqual(['account', undefined])
    })
  })

  describe('busySlots', () => {
    it('should return query key with all options', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      const result = QueryKeys.busySlots({
        id: 'user-123',
        start,
        end,
        limit: 10,
        offset: 0,
      })
      expect(result).toEqual(['busySlots', 'user-123', start, end, 10, 0])
    })

    it('should return query key with partial options', () => {
      const result = QueryKeys.busySlots({ id: 'user-123' })
      expect(result).toEqual([
        'busySlots',
        'user-123',
        undefined,
        undefined,
        undefined,
        undefined,
      ])
    })

    it('should handle empty options', () => {
      const result = QueryKeys.busySlots({})
      expect(result).toEqual([
        'busySlots',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ])
    })
  })

  describe('discordUserInfo', () => {
    it('should return query key with address', () => {
      const result = QueryKeys.discordUserInfo('0x123')
      expect(result).toEqual(['discordUserInfo', '0x123'])
    })

    it('should return query key without address', () => {
      const result = QueryKeys.discordUserInfo()
      expect(result).toEqual(['discordUserInfo', undefined])
    })
  })

  describe('transactionHash', () => {
    it('should return query key with transaction', () => {
      const result = QueryKeys.transactionHash('0xtx123')
      expect(result).toEqual(['transactionHash', '0xtx123'])
    })

    it('should return query key without transaction', () => {
      const result = QueryKeys.transactionHash()
      expect(result).toEqual(['transactionHash', undefined])
    })
  })

  describe('chainLinkAggregator', () => {
    it('should return query key with all params', () => {
      const result = QueryKeys.chainLinkAggregator('0xfeed', 1, 'latestAnswer')
      expect(result).toEqual([
        'chainLinkAggregator',
        '0xfeed',
        1,
        'latestAnswer',
      ])
    })
  })

  describe('groups', () => {
    it('should return query key with account and search', () => {
      const result = QueryKeys.groups('0x123', 'test')
      expect(result).toEqual(['groups', '0x123', 'test'])
    })

    it('should return query key without params', () => {
      const result = QueryKeys.groups()
      expect(result).toEqual(['groups', undefined, undefined])
    })
  })

  describe('groupInvites', () => {
    it('should return query key with account and search', () => {
      const result = QueryKeys.groupInvites('0x123', 'test')
      expect(result).toEqual(['groupInvites', '0x123', 'test'])
    })

    it('should return query key without params', () => {
      const result = QueryKeys.groupInvites()
      expect(result).toEqual(['groupInvites', undefined, undefined])
    })
  })

  describe('exchangeRate', () => {
    it('should return query key with currency', () => {
      const result = QueryKeys.exchangeRate('USD')
      expect(result).toEqual(['exchangeRate', 'USD'])
    })

    it('should handle different currencies', () => {
      expect(QueryKeys.exchangeRate('EUR')).toEqual(['exchangeRate', 'EUR'])
      expect(QueryKeys.exchangeRate('GBP')).toEqual(['exchangeRate', 'GBP'])
    })
  })

  describe('coinConfig', () => {
    it('should return query key', () => {
      const result = QueryKeys.coinConfig()
      expect(result).toEqual(['coinConfig'])
    })
  })

  describe('connectedAccounts', () => {
    it('should return query key with address', () => {
      const result = QueryKeys.connectedAccounts('0x123')
      expect(result).toEqual(['connectedAccounts', '0x123'])
    })

    it('should return query key without address', () => {
      const result = QueryKeys.connectedAccounts()
      expect(result).toEqual(['connectedAccounts', undefined])
    })
  })

  describe('supportedCountries', () => {
    it('should return query key', () => {
      const result = QueryKeys.supportedCountries()
      expect(result).toEqual(['supportedCountries'])
    })
  })

  describe('groupFull', () => {
    it('should return query key with all params', () => {
      const result = QueryKeys.groupFull(10, 0, 'search', true)
      expect(result).toEqual(['groupFull', 10, 0, 'search', true])
    })

    it('should return query key with default includeInvites', () => {
      const result = QueryKeys.groupFull(10, 0, 'search')
      expect(result).toEqual(['groupFull', 10, 0, 'search', true])
    })

    it('should return query key without params', () => {
      const result = QueryKeys.groupFull()
      expect(result).toEqual(['groupFull', undefined, undefined, undefined, true])
    })
  })

  describe('contactFull', () => {
    it('should return query key with all params', () => {
      const result = QueryKeys.contactFull(10, 0, 'john')
      expect(result).toEqual(['contactFull', 10, 0, 'john'])
    })

    it('should return query key without params', () => {
      const result = QueryKeys.contactFull()
      expect(result).toEqual(['contactFull', undefined, undefined, undefined])
    })
  })

  describe('contacts', () => {
    it('should return query key with account and search', () => {
      const result = QueryKeys.contacts('0x123', 'john')
      expect(result).toEqual(['contacts', '0x123', 'john'])
    })

    it('should return query key without params', () => {
      const result = QueryKeys.contacts()
      expect(result).toEqual(['contacts', undefined, undefined])
    })
  })

  describe('contactRequests', () => {
    it('should return query key with account and search', () => {
      const result = QueryKeys.contactRequests('0x123', 'pending')
      expect(result).toEqual(['contactRequests', '0x123', 'pending'])
    })

    it('should return query key without params', () => {
      const result = QueryKeys.contactRequests()
      expect(result).toEqual(['contactRequests', undefined, undefined])
    })
  })
})
