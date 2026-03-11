// biome-ignore lint/style/noCommonJs: Jest requires module exports
module.exports = class WebSocketMock {
  constructor() {
    this.readyState = 1
  }

  static OPEN = 1
  static CLOSED = 3

  send() {}
  close() {
    this.readyState = WebSocketMock.CLOSED
  }
  addEventListener() {}
  removeEventListener() {}
}
