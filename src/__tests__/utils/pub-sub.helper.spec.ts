import Ably from 'ably'

import {
  DEFAULT_MESSAGE_NAME,
  DEFAULT_SUBSCRIPTION_MESSAGE_NAME,
  PubSubManager,
} from '@/utils/pub-sub.helper'

// Mock Ably
jest.mock('ably', () => {
  const mockChannel = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }

  const mockConnection = {
    state: 'connected',
    once: jest.fn((event, callback) => {
      if (event === 'connected') {
        setTimeout(() => callback(), 0)
      }
    }),
    on: jest.fn(),
    close: jest.fn(),
    connect: jest.fn(),
  }

  const mockChannels = {
    get: jest.fn(() => mockChannel),
  }

  return {
    Realtime: jest.fn(() => ({
      channels: mockChannels,
      connection: mockConnection,
    })),
  }
})

describe('pub-sub.helper', () => {
  let pubSubManager: PubSubManager

  beforeEach(() => {
    jest.clearAllMocks()
    pubSubManager = new PubSubManager()
  })

  afterEach(async () => {
    try {
      await pubSubManager.cleanup()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  describe('Constants', () => {
    it('should have correct DEFAULT_MESSAGE_NAME', () => {
      expect(DEFAULT_MESSAGE_NAME).toBe('webhook-event')
    })

    it('should have correct DEFAULT_SUBSCRIPTION_MESSAGE_NAME', () => {
      expect(DEFAULT_SUBSCRIPTION_MESSAGE_NAME).toBe(
        'subscription-webhook-event'
      )
    })
  })

  describe('Connection', () => {
    it('should initialize with Ably', () => {
      expect(Ably.Realtime).toHaveBeenCalled()
    })

    it('should wait for connection to be ready', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(pubSubManager.isConnected()).toBe(true)
    })

    it('should get connection status', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      const status = pubSubManager.getConnectionStatus()
      expect(status).toBe('connected')
    })
  })

  describe('publishMessage', () => {
    it('should publish message to channel', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.publishMessage('test-channel', 'test-event', {
        data: 'test',
      })

      const ably = new Ably.Realtime()
      const channel = ably.channels.get('test-channel')
      expect(channel.publish).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should use default message name', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.publishMessage('test-channel', undefined as any, 'test')

      const ably = new Ably.Realtime()
      const channel = ably.channels.get('test-channel')
      expect(channel.publish).toHaveBeenCalled()
    })

    it('should handle string messages', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.publishMessage('test-channel', 'event', 'simple string')

      const ably = new Ably.Realtime()
      const channel = ably.channels.get('test-channel')
      expect(channel.publish).toHaveBeenCalledWith('event', 'simple string')
    })
  })

  describe('subscribeToMessages', () => {
    it('should subscribe to channel messages', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      const callback = jest.fn()
      await pubSubManager.subscribeToMessages('test-channel', 'event', callback)

      const ably = new Ably.Realtime()
      const channel = ably.channels.get('test-channel')
      expect(channel.subscribe).toHaveBeenCalledWith('event', callback)
    })

    it('should track subscriptions', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      const callback = jest.fn()
      await pubSubManager.subscribeToMessages('test-channel', 'event', callback)

      const count = pubSubManager.getSubscriptionCount('test-channel')
      expect(count).toBe(1)
    })

    it('should track multiple subscriptions', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      await pubSubManager.subscribeToMessages('test-channel', 'event1', callback1)
      await pubSubManager.subscribeToMessages('test-channel', 'event2', callback2)

      const count = pubSubManager.getSubscriptionCount('test-channel')
      expect(count).toBe(2)
    })
  })

  describe('unsubscribeFromMessages', () => {
    it('should unsubscribe specific callback', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      const callback = jest.fn()

      await pubSubManager.subscribeToMessages('test-channel', 'event', callback)
      await pubSubManager.unsubscribeFromMessages('test-channel', 'event', callback)

      const ably = new Ably.Realtime()
      const channel = ably.channels.get('test-channel')
      expect(channel.unsubscribe).toHaveBeenCalledWith('event', callback)
    })

    it('should unsubscribe all callbacks for event', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.subscribeToMessages('test-channel', 'event', jest.fn())
      await pubSubManager.unsubscribeFromMessages('test-channel', 'event')

      const ably = new Ably.Realtime()
      const channel = ably.channels.get('test-channel')
      expect(channel.unsubscribe).toHaveBeenCalledWith('event')
    })

    it('should update subscription count', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      const callback = jest.fn()

      await pubSubManager.subscribeToMessages('test-channel', 'event', callback)
      expect(pubSubManager.getSubscriptionCount('test-channel')).toBe(1)

      await pubSubManager.unsubscribeFromMessages('test-channel', 'event', callback)
      expect(pubSubManager.getSubscriptionCount('test-channel')).toBe(0)
    })
  })

  describe('unsubscribeFromChannel', () => {
    it('should unsubscribe from entire channel', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.subscribeToMessages('test-channel', 'event', jest.fn())
      await pubSubManager.unsubscribeFromChannel('test-channel')

      expect(pubSubManager.getSubscriptionCount('test-channel')).toBe(0)
    })

    it('should remove channel from active channels', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.subscribeToMessages('test-channel', 'event', jest.fn())

      expect(pubSubManager.getActiveChannels()).toContain('test-channel')

      await pubSubManager.unsubscribeFromChannel('test-channel')
      expect(pubSubManager.getActiveChannels()).not.toContain('test-channel')
    })
  })

  describe('getActiveChannels', () => {
    it('should return list of active channels', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.subscribeToMessages('channel1', 'event', jest.fn())
      await pubSubManager.subscribeToMessages('channel2', 'event', jest.fn())

      const channels = pubSubManager.getActiveChannels()
      expect(channels).toHaveLength(2)
      expect(channels).toContain('channel1')
      expect(channels).toContain('channel2')
    })

    it('should return empty array when no channels', () => {
      const channels = pubSubManager.getActiveChannels()
      expect(channels).toEqual([])
    })
  })

  describe('getSubscriptionCount', () => {
    it('should return 0 for non-existent channel', () => {
      const count = pubSubManager.getSubscriptionCount('non-existent')
      expect(count).toBe(0)
    })

    it('should count multiple subscriptions correctly', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.subscribeToMessages('test-channel', 'event1', jest.fn())
      await pubSubManager.subscribeToMessages('test-channel', 'event1', jest.fn())
      await pubSubManager.subscribeToMessages('test-channel', 'event2', jest.fn())

      const count = pubSubManager.getSubscriptionCount('test-channel')
      expect(count).toBe(3)
    })
  })

  describe('cleanup', () => {
    it('should close connection on cleanup', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.cleanup()

      const ably = new Ably.Realtime()
      expect(ably.connection.close).toHaveBeenCalled()
    })

    it('should unsubscribe from all channels', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await pubSubManager.subscribeToMessages('channel1', 'event', jest.fn())
      await pubSubManager.subscribeToMessages('channel2', 'event', jest.fn())

      await pubSubManager.cleanup()

      expect(pubSubManager.getActiveChannels()).toHaveLength(0)
    })
  })

  describe('reconnect', () => {
    it('should call connect when not connected', async () => {
      const ably = new Ably.Realtime()
      ;(ably.connection as any).state = 'disconnected'

      await pubSubManager.reconnect()

      expect(ably.connection.connect).toHaveBeenCalled()
    })
  })
})
