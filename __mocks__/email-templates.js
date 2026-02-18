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

module.exports = Email
