/**
 * Smoke tests for all hooks in the meetwith project
 *
 * These tests verify that hooks can be imported without crashing
 * and that their exports are properly defined.
 */

// Mock dependencies not covered by global jest.setup.js
jest.mock('@/utils/analytics', () => ({
  logEvent: jest.fn(),
}))

jest.mock('@/utils/api_helper', () => ({
  createAvailabilityBlock: jest.fn(),
  deleteAvailabilityBlock: jest.fn(),
  duplicateAvailabilityBlock: jest.fn(),
  getAvailabilityBlock: jest.fn(),
  getAvailabilityBlocks: jest.fn(),
  getMeetingType: jest.fn(),
  getMeetingTypes: jest.fn(),
  getMeetingTypesForAvailabilityBlock: jest.fn(),
  getWalletTransactions: jest.fn(),
  updateAvailabilityBlock: jest.fn(),
  updateAvailabilityBlockMeetingTypes: jest.fn(),
}))

jest.mock('@/utils/walletConfig', () => ({
  getCryptoConfig: jest.fn(),
}))

jest.mock('@/utils/token.service', () => ({
  getCryptoTokenBalance: jest.fn(),
  getTotalWalletBalance: jest.fn(),
}))

jest.mock('@/utils/user_manager', () => ({
  getAccountDisplayName: jest.fn(() => 'Test User'),
  thirdWebClient: {},
}))

jest.mock('@/utils/toasts', () => ({
  useToastHelpers: jest.fn(() => ({
    showErrorToast: jest.fn(),
    showSuccessToast: jest.fn(),
  })),
}))

jest.mock('@/utils/availability.helper', () => ({
  getBestTimezone: jest.fn(() => 'UTC'),
  initializeDefaultAvailabilities: jest.fn(() => []),
  validateAvailabilityBlock: jest.fn(() => ({ isValid: true })),
}))

jest.mock('@/utils/generic_utils', () => ({
  formatCurrency: jest.fn(() => '$0.00'),
  isJson: jest.fn(() => false),
  zeroAddress: '0x0000000000000000000000000000000000000000',
}))

jest.mock('@/utils/constants', () => ({
  COMMON_CURRENCIES: {},
  getCurrencyDisplayName: jest.fn(() => 'USD'),
  isSupportedCurrency: jest.fn(() => true),
}))

jest.mock('@/utils/services/currency.service', () => ({
  CurrencyService: {
    convert: jest.fn(),
  },
}))

jest.mock('@/utils/calendar_event_url', () => ({
  generateCalendarEventUrl: jest.fn(() => ''),
}))

jest.mock('@/providers/AccountProvider', () => ({
  AccountContext: {
    Consumer: jest.fn(),
    Provider: jest.fn(),
  },
}))

jest.mock('@/types/chains', () => ({
  getChainId: jest.fn(() => 1),
  getTokenIcon: jest.fn(() => ''),
  SupportedChain: {},
  supportedChains: [],
}))

describe('hooks', () => {
  describe('src/hooks - imports', () => {
    it('should import useAccountContext without crashing', () => {
      expect(() => require('@/hooks/useAccountContext')).not.toThrow()
    })

    it('should import useAllMeetingTypes without crashing', () => {
      expect(() => require('@/hooks/useAllMeetingTypes')).not.toThrow()
    })

    it('should import useClipboard without crashing', () => {
      expect(() => require('@/hooks/useClipboard')).not.toThrow()
    })

    it('should import useCryptoBalance without crashing', () => {
      expect(() => require('@/hooks/useCryptoBalance')).not.toThrow()
    })

    it('should import useCryptoBalances without crashing', () => {
      expect(() => require('@/hooks/useCryptoBalances')).not.toThrow()
    })

    it('should import useCryptoConfig without crashing', () => {
      expect(() => require('@/hooks/useCryptoConfig')).not.toThrow()
    })

    it('should import useDebounceCallback without crashing', () => {
      expect(() => require('@/hooks/useDebounceCallback')).not.toThrow()
    })

    it('should import useDebounceValue without crashing', () => {
      expect(() => require('@/hooks/useDebounceValue')).not.toThrow()
    })

    it('should import useMeetingType without crashing', () => {
      expect(() => require('@/hooks/useMeetingType')).not.toThrow()
    })

    it('should import usePoller without crashing', () => {
      expect(() => require('@/hooks/usePoller')).not.toThrow()
    })

    it('should import useSlotCache without crashing', () => {
      expect(() => require('@/hooks/useSlotCache')).not.toThrow()
    })

    it('should import useSlotsWithAvailability without crashing', () => {
      expect(() => require('@/hooks/useSlotsWithAvailability')).not.toThrow()
    })

    it('should import useSmartReconnect without crashing', () => {
      expect(() => require('@/hooks/useSmartReconnect')).not.toThrow()
    })

    it('should import useTimeRangeSlotCache without crashing', () => {
      expect(() => require('@/hooks/useTimeRangeSlotCache')).not.toThrow()
    })

    it('should import useUnmount without crashing', () => {
      expect(() => require('@/hooks/useUnmount')).not.toThrow()
    })

    it('should import useWalletBalance without crashing', () => {
      expect(() => require('@/hooks/useWalletBalance')).not.toThrow()
    })

    it('should import useWalletTransactions without crashing', () => {
      expect(() => require('@/hooks/useWalletTransactions')).not.toThrow()
    })
  })

  describe('src/hooks/availability - imports', () => {
    it('should import availability index without crashing', () => {
      expect(() => require('@/hooks/availability')).not.toThrow()
    })

    it('should import useAvailabilityBlock without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlock')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlockFormHandlers without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlockFormHandlers')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlockHandlers without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlockHandlers')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlockMeetingTypes without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlockMeetingTypes')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlockMutations without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlockMutations')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlockUIState without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlockUIState')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlockValidation without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlockValidation')
      ).not.toThrow()
    })

    it('should import useAvailabilityBlocks without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityBlocks')
      ).not.toThrow()
    })

    it('should import useAvailabilityForm without crashing', () => {
      expect(
        () => require('@/hooks/availability/useAvailabilityForm')
      ).not.toThrow()
    })
  })

  describe('src/hooks - exports are defined', () => {
    it('useAccountContext should have a default export', () => {
      const mod = require('@/hooks/useAccountContext')
      expect(mod.default).toBeDefined()
    })

    it('useAllMeetingTypes should export useAllMeetingTypes', () => {
      const mod = require('@/hooks/useAllMeetingTypes')
      expect(mod.useAllMeetingTypes).toBeDefined()
    })

    it('useClipboard should have a default export', () => {
      const mod = require('@/hooks/useClipboard')
      expect(mod.default).toBeDefined()
    })

    it('useCryptoBalance should export useCryptoBalance', () => {
      const mod = require('@/hooks/useCryptoBalance')
      expect(mod.useCryptoBalance).toBeDefined()
    })

    it('useCryptoBalances should export useCryptoBalances', () => {
      const mod = require('@/hooks/useCryptoBalances')
      expect(mod.useCryptoBalances).toBeDefined()
    })

    it('useCryptoConfig should export useCryptoConfig', () => {
      const mod = require('@/hooks/useCryptoConfig')
      expect(mod.useCryptoConfig).toBeDefined()
    })

    it('useDebounceCallback should export useDebounceCallback', () => {
      const mod = require('@/hooks/useDebounceCallback')
      expect(mod.useDebounceCallback).toBeDefined()
    })

    it('useDebounceValue should export useDebounceValue', () => {
      const mod = require('@/hooks/useDebounceValue')
      expect(mod.useDebounceValue).toBeDefined()
    })

    it('useMeetingType should export useMeetingType', () => {
      const mod = require('@/hooks/useMeetingType')
      expect(mod.useMeetingType).toBeDefined()
    })

    it('usePoller should have a default export', () => {
      const mod = require('@/hooks/usePoller')
      expect(mod.default).toBeDefined()
    })

    it('useSlotCache should have a default export', () => {
      const mod = require('@/hooks/useSlotCache')
      expect(mod.default).toBeDefined()
    })

    it('useSlotsWithAvailability should have a default export', () => {
      const mod = require('@/hooks/useSlotsWithAvailability')
      expect(mod.default).toBeDefined()
    })

    it('useSmartReconnect should export useSmartReconnect', () => {
      const mod = require('@/hooks/useSmartReconnect')
      expect(mod.useSmartReconnect).toBeDefined()
    })

    it('useTimeRangeSlotCache should have a default export', () => {
      const mod = require('@/hooks/useTimeRangeSlotCache')
      expect(mod.default).toBeDefined()
    })

    it('useUnmount should export useUnmount', () => {
      const mod = require('@/hooks/useUnmount')
      expect(mod.useUnmount).toBeDefined()
    })

    it('useWalletBalance should export useWalletBalance', () => {
      const mod = require('@/hooks/useWalletBalance')
      expect(mod.useWalletBalance).toBeDefined()
    })

    it('useWalletTransactions should export useWalletTransactions', () => {
      const mod = require('@/hooks/useWalletTransactions')
      expect(mod.useWalletTransactions).toBeDefined()
    })
  })

  describe('src/hooks/availability - exports are defined', () => {
    it('availability index should export all hooks', () => {
      const mod = require('@/hooks/availability')
      expect(mod.useAvailabilityBlock).toBeDefined()
      expect(mod.useAvailabilityBlockFormHandlers).toBeDefined()
      expect(mod.useAvailabilityBlockHandlers).toBeDefined()
      expect(mod.useAvailabilityBlockMeetingTypes).toBeDefined()
      expect(mod.useUpdateAvailabilityBlockMeetingTypes).toBeDefined()
      expect(mod.useAvailabilityBlockMutations).toBeDefined()
      expect(mod.useAvailabilityBlocks).toBeDefined()
      expect(mod.useAvailabilityBlockUIState).toBeDefined()
      expect(mod.useAvailabilityBlockValidation).toBeDefined()
      expect(mod.useAvailabilityForm).toBeDefined()
    })

    it('useAvailabilityBlock should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlock')
      expect(typeof mod.useAvailabilityBlock).toBe('function')
    })

    it('useAvailabilityBlockFormHandlers should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlockFormHandlers')
      expect(typeof mod.useAvailabilityBlockFormHandlers).toBe('function')
    })

    it('useAvailabilityBlockHandlers should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlockHandlers')
      expect(typeof mod.useAvailabilityBlockHandlers).toBe('function')
    })

    it('useAvailabilityBlockMeetingTypes should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlockMeetingTypes')
      expect(typeof mod.useAvailabilityBlockMeetingTypes).toBe('function')
    })

    it('useAvailabilityBlockMutations should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlockMutations')
      expect(typeof mod.useAvailabilityBlockMutations).toBe('function')
    })

    it('useAvailabilityBlockUIState should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlockUIState')
      expect(typeof mod.useAvailabilityBlockUIState).toBe('function')
    })

    it('useAvailabilityBlockValidation should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlockValidation')
      expect(typeof mod.useAvailabilityBlockValidation).toBe('function')
    })

    it('useAvailabilityBlocks should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityBlocks')
      expect(typeof mod.useAvailabilityBlocks).toBe('function')
    })

    it('useAvailabilityForm should be a function', () => {
      const mod = require('@/hooks/availability/useAvailabilityForm')
      expect(typeof mod.useAvailabilityForm).toBe('function')
    })
  })

  describe('simple hook rendering with renderHook', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { renderHook, act } = require('@testing-library/react')

    it('useUnmount calls cleanup on unmount', () => {
      const { useUnmount } = require('@/hooks/useUnmount')
      const cleanup = jest.fn()
      const { unmount } = renderHook(() => useUnmount(cleanup))
      expect(cleanup).not.toHaveBeenCalled()
      unmount()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it('usePoller returns a function', () => {
      const usePoller = require('@/hooks/usePoller').default
      const { result } = renderHook(() => usePoller())
      expect(typeof result.current).toBe('function')
    })

    it('useClipboard returns copyFeedbackOpen and handleCopy', () => {
      const useClipboard = require('@/hooks/useClipboard').default
      const { result } = renderHook(() => useClipboard())
      expect(result.current.copyFeedbackOpen).toBe(false)
      expect(typeof result.current.handleCopy).toBe('function')
    })

    it('useAvailabilityBlockUIState returns UI state and setters', () => {
      const {
        useAvailabilityBlockUIState,
      } = require('@/hooks/availability/useAvailabilityBlockUIState')
      const { result } = renderHook(() => useAvailabilityBlockUIState())
      expect(result.current.isEditing).toBe(false)
      expect(result.current.editingBlockId).toBeNull()
      expect(typeof result.current.resetUIState).toBe('function')
    })

    it('useSlotCache returns an array of slots', () => {
      const useSlotCache = require('@/hooks/useSlotCache').default
      const { result } = renderHook(() => useSlotCache(30, 'UTC'))
      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current.length).toBe((24 * 60) / 30)
    })

    it('useTimeRangeSlotCache returns an array of slots', () => {
      const useTimeRangeSlotCache =
        require('@/hooks/useTimeRangeSlotCache').default
      const { result } = renderHook(() =>
        useTimeRangeSlotCache('09:00', '17:00', 'UTC')
      )
      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current.length).toBeGreaterThan(0)
    })

    it('useDebounceCallback returns a debounced function', () => {
      const {
        useDebounceCallback,
      } = require('@/hooks/useDebounceCallback')
      const callback = jest.fn()
      const { result } = renderHook(() => useDebounceCallback(callback, 300))
      expect(typeof result.current).toBe('function')
      expect(typeof result.current.cancel).toBe('function')
      expect(typeof result.current.flush).toBe('function')
      expect(typeof result.current.isPending).toBe('function')
    })
  })
})
