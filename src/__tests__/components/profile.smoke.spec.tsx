/**
 * Smoke tests for profile components
 * 
 * These tests verify that components can be imported and have basic structure
 */

describe('profile components', () => {
  describe('profile components - imports', () => {
    it('should import AccountDetails without crashing', () => {
      expect(() => require('@/components/profile/AccountDetails')).not.toThrow()
    })

    it('should import AccountPlansAndBilling without crashing', () => {
      expect(() => require('@/components/profile/AccountPlansAndBilling')).not.toThrow()
    })

    it('should import Clientboard without crashing', () => {
      expect(() => require('@/components/profile/Clientboard')).not.toThrow()
    })

    it('should import ConnectCalendar without crashing', () => {
      expect(() => require('@/components/profile/ConnectCalendar')).not.toThrow()
    })

    it('should import ConnectedAccounts without crashing', () => {
      expect(() => require('@/components/profile/ConnectedAccounts')).not.toThrow()
    })

    it('should import Contact without crashing', () => {
      expect(() => require('@/components/profile/Contact')).not.toThrow()
    })

    it('should import DashboardContent without crashing', () => {
      expect(() => require('@/components/profile/DashboardContent')).not.toThrow()
    })

    it('should import Group without crashing', () => {
      expect(() => require('@/components/profile/Group')).not.toThrow()
    })

    it('should import MeetingPlatform without crashing', () => {
      expect(() => require('@/components/profile/MeetingPlatform')).not.toThrow()
    })

    it('should import MeetingSettings without crashing', () => {
      expect(() => require('@/components/profile/MeetingSettings')).not.toThrow()
    })

    it('should import MeetingTypesConfig without crashing', () => {
      expect(() => require('@/components/profile/MeetingTypesConfig')).not.toThrow()
    })

    it('should import Meetings without crashing', () => {
      expect(() => require('@/components/profile/Meetings')).not.toThrow()
    })

    it('should import NavBarLoggedProfile without crashing', () => {
      expect(() => require('@/components/profile/NavBarLoggedProfile')).not.toThrow()
    })

    it('should import Pagination without crashing', () => {
      expect(() => require('@/components/profile/Pagination')).not.toThrow()
    })

    it('should import ReceiveFundsModal without crashing', () => {
      expect(() => require('@/components/profile/ReceiveFundsModal')).not.toThrow()
    })

    it('should import SendFundsModal without crashing', () => {
      expect(() => require('@/components/profile/SendFundsModal')).not.toThrow()
    })

    it('should import Settings without crashing', () => {
      expect(() => require('@/components/profile/Settings')).not.toThrow()
    })

    it('should import SubscriptionDialog without crashing', () => {
      expect(() => require('@/components/profile/SubscriptionDialog')).not.toThrow()
    })

    it('should import TransactionDetailsView without crashing', () => {
      expect(() => require('@/components/profile/TransactionDetailsView')).not.toThrow()
    })

    it('should import TransactionSuccessModal without crashing', () => {
      expect(() => require('@/components/profile/TransactionSuccessModal')).not.toThrow()
    })

    it('should import Wallet without crashing', () => {
      expect(() => require('@/components/profile/Wallet')).not.toThrow()
    })

    it('should import WalletAndPayment without crashing', () => {
      expect(() => require('@/components/profile/WalletAndPayment')).not.toThrow()
    })
  })

  describe('profile sub-components - imports', () => {
    it('should import Avatar without crashing', () => {
      expect(() => require('@/components/profile/components/Avatar')).not.toThrow()
    })

    it('should import BannerPreviewModal without crashing', () => {
      expect(() => require('@/components/profile/components/BannerPreviewModal')).not.toThrow()
    })

    it('should import Block without crashing', () => {
      expect(() => require('@/components/profile/components/Block')).not.toThrow()
    })

    it('should import CancelSubscriptionModal without crashing', () => {
      expect(() => require('@/components/profile/components/CancelSubscriptionModal')).not.toThrow()
    })

    it('should import ChangeEmailModal without crashing', () => {
      expect(() => require('@/components/profile/components/ChangeEmailModal')).not.toThrow()
    })

    it('should import CopyLinkButton without crashing', () => {
      expect(() => require('@/components/profile/components/CopyLinkButton')).not.toThrow()
    })

    it('should import CouponUsedModal without crashing', () => {
      expect(() => require('@/components/profile/components/CouponUsedModal')).not.toThrow()
    })

    it('should import CurrencySelector without crashing', () => {
      expect(() => require('@/components/profile/components/CurrencySelector')).not.toThrow()
    })

    it('should import EditBannerImageModal without crashing', () => {
      expect(() => require('@/components/profile/components/EditBannerImageModal')).not.toThrow()
    })

    it('should import EditImageModal without crashing', () => {
      expect(() => require('@/components/profile/components/EditImageModal')).not.toThrow()
    })

    it('should import HandlePicker without crashing', () => {
      expect(() => require('@/components/profile/components/HandlePicker')).not.toThrow()
    })

    it('should import MagicLinkModal without crashing', () => {
      expect(() => require('@/components/profile/components/MagicLinkModal')).not.toThrow()
    })

    it('should import NavItem without crashing', () => {
      expect(() => require('@/components/profile/components/NavItem')).not.toThrow()
    })

    it('should import NavMenu without crashing', () => {
      expect(() => require('@/components/profile/components/NavMenu')).not.toThrow()
    })

    it('should import NetworkDropdown without crashing', () => {
      expect(() => require('@/components/profile/components/NetworkDropdown')).not.toThrow()
    })

    it('should import NetworkSelector without crashing', () => {
      expect(() => require('@/components/profile/components/NetworkSelector')).not.toThrow()
    })

    it('should import ProUpgradePrompt without crashing', () => {
      expect(() => require('@/components/profile/components/ProUpgradePrompt')).not.toThrow()
    })

    it('should import ResetPinModal without crashing', () => {
      expect(() => require('@/components/profile/components/ResetPinModal')).not.toThrow()
    })

    it('should import RichTextEditor without crashing', () => {
      expect(() => require('@/components/profile/components/RichTextEditor')).not.toThrow()
    })

    it('should import SuccessModal without crashing', () => {
      expect(() => require('@/components/profile/components/SuccessModal')).not.toThrow()
    })

    it('should import TokenDropdown without crashing', () => {
      expect(() => require('@/components/profile/components/TokenDropdown')).not.toThrow()
    })

    it('should import ToolBar without crashing', () => {
      expect(() => require('@/components/profile/components/ToolBar')).not.toThrow()
    })

    it('should import Tooltip without crashing', () => {
      expect(() => require('@/components/profile/components/Tooltip')).not.toThrow()
    })

    it('should import TransactionPinModal without crashing', () => {
      expect(() => require('@/components/profile/components/TransactionPinModal')).not.toThrow()
    })

    it('should import TransactionVerificationModal without crashing', () => {
      expect(() => require('@/components/profile/components/TransactionVerificationModal')).not.toThrow()
    })

    it('should import WalletActionButton without crashing', () => {
      expect(() => require('@/components/profile/components/WalletActionButton')).not.toThrow()
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
