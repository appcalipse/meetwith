/**
 * Smoke tests for profile components
 * 
 * These tests verify that components can be imported and have basic structure
 */

describe('profile components', () => {
  describe('main profile components', () => {
    it('should import AccountDetails without crashing', () => {
      expect(() => require('@/components/profile/AccountDetails')).not.toThrow()
    })
  })

  describe('profile sub-components', () => {
    it('should import MagicLinkModal without crashing', () => {
      expect(() => require('@/components/profile/components/MagicLinkModal')).not.toThrow()
    })

    it('should import TransactionPinModal without crashing', () => {
      expect(() => require('@/components/profile/components/TransactionPinModal')).not.toThrow()
    })

    it('should import WalletActionButton without crashing', () => {
      expect(() => require('@/components/profile/components/WalletActionButton')).not.toThrow()
    })

    it('should import NavMenu without crashing', () => {
      expect(() => require('@/components/profile/components/NavMenu')).not.toThrow()
    })

    it('should import Block without crashing', () => {
      expect(() => require('@/components/profile/components/Block')).not.toThrow()
    })

    it('should import TransactionVerificationModal without crashing', () => {
      expect(() => require('@/components/profile/components/TransactionVerificationModal')).not.toThrow()
    })

    it('should import RichTextEditor without crashing', () => {
      expect(() => require('@/components/profile/components/RichTextEditor')).not.toThrow()
    })

    it('should import SuccessModal without crashing', () => {
      expect(() => require('@/components/profile/components/SuccessModal')).not.toThrow()
    })

    it('should import ToolBar without crashing', () => {
      expect(() => require('@/components/profile/components/ToolBar')).not.toThrow()
    })

    it('should import ResetPinModal without crashing', () => {
      expect(() => require('@/components/profile/components/ResetPinModal')).not.toThrow()
    })

    it('should import CopyLinkButton without crashing', () => {
      expect(() => require('@/components/profile/components/CopyLinkButton')).not.toThrow()
    })

    it('should import ProUpgradePrompt without crashing', () => {
      expect(() => require('@/components/profile/components/ProUpgradePrompt')).not.toThrow()
    })

    it('should import CancelSubscriptionModal without crashing', () => {
      expect(() => require('@/components/profile/components/CancelSubscriptionModal')).not.toThrow()
    })

    it('should import NetworkDropdown without crashing', () => {
      expect(() => require('@/components/profile/components/NetworkDropdown')).not.toThrow()
    })

    it('should import BannerPreviewModal without crashing', () => {
      expect(() => require('@/components/profile/components/BannerPreviewModal')).not.toThrow()
    })

    it('should import EditImageModal without crashing', () => {
      expect(() => require('@/components/profile/components/EditImageModal')).not.toThrow()
    })

    it('should import CurrencySelector without crashing', () => {
      expect(() => require('@/components/profile/components/CurrencySelector')).not.toThrow()
    })

    it('should import Tooltip without crashing', () => {
      expect(() => require('@/components/profile/components/Tooltip')).not.toThrow()
    })

    it('should import NavItem without crashing', () => {
      expect(() => require('@/components/profile/components/NavItem')).not.toThrow()
    })
  })

  describe('component structure', () => {
    it('AccountDetails should have exports', () => {
      const component = require('@/components/profile/AccountDetails')
      expect(component).toBeDefined()
    })

    it('NavMenu should have exports', () => {
      const component = require('@/components/profile/components/NavMenu')
      expect(component).toBeDefined()
    })

    it('RichTextEditor should have exports', () => {
      const component = require('@/components/profile/components/RichTextEditor')
      expect(component).toBeDefined()
    })
  })
})
