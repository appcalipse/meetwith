// Mock for email-templates package
class Email {
  async render(template, locals) {
    return `<html><body>Mocked HTML for ${template}</body></html>`
  }

  async renderAll(template, locals) {
    return {
      html: `<html><body>Mocked HTML for ${template}</body></html>`,
      text: `Mocked text for ${template}`,
      subject: `Mocked Subject for ${template}`,
    }
  }
}

// Create a jest mock that returns the Email class
const EmailMock = jest.fn().mockImplementation((config) => new Email())

// Make it compatible with both default and named exports
module.exports = EmailMock
module.exports.default = EmailMock
