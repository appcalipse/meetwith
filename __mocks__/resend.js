// Mock for resend package
class Resend {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.emails = {
      send: jest.fn().mockResolvedValue({
        id: 'test-email-id-' + Math.random().toString(36).substring(7),
        from: 'noreply@meetwith.com',
      }),
    }
  }
}

module.exports = {
  Resend,
}
