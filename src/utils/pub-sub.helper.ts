import Ably, { InboundMessage, RealtimeChannel } from 'ably'

export const DEFAULT_MESSAGE_NAME = 'webhook-event'
export const DEFAULT_SUBSCRIPTION_MESSAGE_NAME = 'subscription-webhook-event'

interface SubscriptionCallback {
  (message: InboundMessage): void
}

interface ChannelSubscriptions {
  [messageName: string]: SubscriptionCallback[]
}

export class PubSubManager {
  private ably: Ably.Realtime
  private isReady = false
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptions: Map<string, ChannelSubscriptions> = new Map()
  private readyPromise: Promise<void>

  constructor() {
    this.ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY || '')

    this.readyPromise = new Promise(resolve => {
      this.ably.connection.once('connected', () => {
        // eslint-disable-next-line no-restricted-syntax
        console.log('Connected to Ably!')
        this.isReady = true
        resolve()
      })

      // Handle connection failures
      this.ably.connection.on('failed', error => {
        console.error('Ably connection failed:', error)
      })

      this.ably.connection.on('disconnected', () => {
        console.warn('Ably connection disconnected')
        this.isReady = false
      })
    })
  }

  /**
   * Ensure connection is ready before operations
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isReady) {
      await this.readyPromise
    }
  }

  /**
   * Get or create a channel instance
   */
  private async getChannel(channelName: string): Promise<RealtimeChannel> {
    await this.ensureConnection()

    if (!this.channels.has(channelName)) {
      const channel = this.ably.channels.get(channelName)
      this.channels.set(channelName, channel)
    }

    return this.channels.get(channelName)!
  }

  /**
   * Publish a message to a channel
   */
  async publishMessage(
    channel: string,
    name: string = DEFAULT_MESSAGE_NAME,
    message: string | object
  ): Promise<void> {
    try {
      const channelInstance = await this.getChannel(channel)
      await channelInstance.publish(name, message)
    } catch (error) {
      console.error(`Failed to publish message to channel "${channel}":`, error)
      throw error
    }
  }

  /**
   * Subscribe to messages on a channel
   */
  async subscribeToMessages(
    channel: string,
    name: string = DEFAULT_MESSAGE_NAME,
    callback: SubscriptionCallback
  ): Promise<void> {
    try {
      const channelInstance = await this.getChannel(channel)

      // Track subscription for cleanup
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, {})
      }

      const channelSubs = this.subscriptions.get(channel)!
      if (!channelSubs[name]) {
        channelSubs[name] = []
      }
      channelSubs[name].push(callback)

      // Subscribe to the channel
      channelInstance.subscribe(name, callback)
    } catch (error) {
      console.error(`Failed to subscribe to channel "${channel}":`, error)
      throw error
    }
  }

  /**
   * Unsubscribe from messages on a channel
   */
  async unsubscribeFromMessages(
    channel: string,
    name: string = DEFAULT_MESSAGE_NAME,
    callback?: SubscriptionCallback
  ): Promise<void> {
    try {
      const channelInstance = await this.getChannel(channel)

      if (callback) {
        // Unsubscribe specific callback
        channelInstance.unsubscribe(name, callback)

        // Remove from tracking
        const channelSubs = this.subscriptions.get(channel)
        if (channelSubs && channelSubs[name]) {
          channelSubs[name] = channelSubs[name].filter(cb => cb !== callback)
          if (channelSubs[name].length === 0) {
            delete channelSubs[name]
          }
        }
      } else {
        // Unsubscribe all callbacks for this message name
        channelInstance.unsubscribe(name)

        // Remove from tracking
        const channelSubs = this.subscriptions.get(channel)
        if (channelSubs) {
          delete channelSubs[name]
        }
      }
    } catch (error) {
      console.error(`Failed to unsubscribe from channel "${channel}":`, error)
      throw error
    }
  }

  async unsubscribeFromChannel(channel: string): Promise<void> {
    try {
      const channelInstance = this.channels.get(channel)
      if (channelInstance) {
        channelInstance.unsubscribe()
        this.channels.delete(channel)
        this.subscriptions.delete(channel)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    return this.ably.connection.state
  }

  /**
   * Check if connected and ready
   */
  isConnected(): boolean {
    return this.isReady && this.ably.connection.state === 'connected'
  }

  /**
   * Get list of active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Get subscription count for a channel
   */
  getSubscriptionCount(channel: string): number {
    const channelSubs = this.subscriptions.get(channel)
    if (!channelSubs) return 0

    return Object.values(channelSubs).reduce(
      (total, callbacks) => total + callbacks.length,
      0
    )
  }

  /**
   * Clean up all connections and subscriptions
   */
  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const channel of this.channels.keys()) {
        await this.unsubscribeFromChannel(channel)
      }

      // Close connection
      this.ably.connection.close()
    } catch (error) {
      console.error('Error during cleanup:', error)
      throw error
    }
  }

  /**
   * Reconnect if disconnected
   */
  async reconnect(): Promise<void> {
    if (!this.isConnected()) {
      this.ably.connection.connect()
      await this.readyPromise
    }
  }
}
