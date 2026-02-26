// Mock for puppeteer package
const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  setViewport: jest.fn().mockResolvedValue(undefined),
  goto: jest.fn().mockResolvedValue(undefined),
  screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
  evaluate: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  close: jest.fn().mockResolvedValue(undefined),
}

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
}

module.exports = {
  launch: jest.fn().mockResolvedValue(mockBrowser),
  default: {
    launch: jest.fn().mockResolvedValue(mockBrowser),
  },
}
