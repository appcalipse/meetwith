import Ably from 'ably'
const ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY || '')
export const DEFAULT_MESSAGE_NAME = 'webhook-event'
let isReady = false
ably.connection.once('connected', () => {
  // eslint-disable-next-line no-restricted-syntax
  console.log('Connected to Ably!')
  isReady = true
})

const getChannel = async (channel: string): Promise<Ably.RealtimeChannel> => {
  return new Promise(resolve => {
    if (!isReady) {
      ably.connection.once('connected', () => {
        resolve(ably.channels.get(channel))
      })
    }
    resolve(ably.channels.get(channel))
  })
}

export const publishMessage = async (
  channel: string,
  name = DEFAULT_MESSAGE_NAME,
  message: unknown
) => {
  const channelInstance = await getChannel(channel)
  channelInstance.publish(name, message)
}

export const subscribeToMessages = async (
  channel: string,
  name = DEFAULT_MESSAGE_NAME,
  callback: (message: unknown) => void
) => {
  const channelInstance = await getChannel(channel)
  channelInstance.subscribe(name, callback)
}
