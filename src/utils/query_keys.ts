import { Address } from '@/types/Transactions'

export default class QueryKeys {
  static connectedCalendars(syncOnly?: boolean) {
    return ['connectedCalendars', syncOnly]
  }

  static meetingsByAccount(account?: string) {
    return ['meetingsByAccount', account]
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
}
