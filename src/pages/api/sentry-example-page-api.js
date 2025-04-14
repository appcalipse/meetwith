export default function handler(req, res) {
  throw new Error('Sentry Example API Error')
  res.status(200).json({ message: 'Hello from Sentry Example API!' })
}
