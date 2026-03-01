import { DateTime } from 'luxon'
import { Address } from '@/types/Transactions'

export default class QueryKeys {
  static existingAccounts(addresses: string[], fullInformation: boolean) {
    return ['existingAccounts', addresses.sort(), fullInformation]
  }

  static connectedCalendars(syncOnly = false): readonly unknown[] {
    return ['connectedCalendars', syncOnly]
  }

  static meetingsByAccount(account?: string) {
    return ['meetingsByAccount', account?.toLowerCase()]
  }

  static calendarEvents(date?: DateTime) {
    return [
      'calendarEvents',
      date?.startOf('month').startOf('week').toISODate() || '',
      date?.endOf('month').endOf('week').toISODate() || '',
    ].filter(Boolean)
  }

  static meeting(slot_id?: string) {
    return ['meeting', slot_id]
  }
  static account(id?: string) {
    return ['account', id]
  }

  static busySlots(options: {
    id?: string
    start?: Date
    end?: Date
    limit?: number
    offset?: number
  }) {
    const { id, start, end, limit, offset } = options
    return ['busySlots', id, start, end, limit, offset]
  }

  static discordUserInfo(address?: string) {
    return ['discordUserInfo', address]
  }

  static transactionHash(tx?: Address) {
    return ['transactionHash', tx]
  }
  static chainLinkAggregator(
    feedAddress: string,
    chainId: number,
    method: string
  ) {
    return ['chainLinkAggregator', feedAddress, chainId, method]
  }
  static groups(accountAddress?: string, search?: string) {
    return ['groups', accountAddress, search]
  }
  static groupInvites(accountAddress?: string, search?: string) {
    return ['groupInvites', accountAddress, search]
  }
  static exchangeRate(currency: string) {
    return ['exchangeRate', currency]
  }
  static coinConfig() {
    return ['coinConfig']
  }
  static connectedAccounts(accountAddress?: string) {
    return ['connectedAccounts', accountAddress]
  }
  static supportedCountries() {
    return ['supportedCountries']
  }
  static groupFull(
    limit?: number,
    offset?: number,
    search?: string,
    includeInvites = true
  ) {
    return ['groupFull', limit, offset, search, includeInvites]
  }
  static contactFull(limit?: number, offset?: number, query?: string) {
    return ['contactFull', limit, offset, query]
  }
  static contacts(accountAddress?: string, search?: string) {
    return ['contacts', accountAddress, search]
  }
  static contactRequests(accountAddress?: string, search?: string) {
    return ['contactRequests', accountAddress, search]
  }
  static upcomingMeetings(accountAddress?: string) {
    return ['upcomingMeetings', accountAddress || '']
  }
}
