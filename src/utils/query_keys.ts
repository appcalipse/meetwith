export default class QueryKeys {
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
}
