describe('public-meeting components', () => {
  describe('imports', () => {
    it('should import BasePage without crashing', () => {
      expect(() => require('@/components/public-meeting/BasePage')).not.toThrow()
    })

    it('should import BookingComponent without crashing', () => {
      expect(() => require('@/components/public-meeting/BookingComponent')).not.toThrow()
    })

    it('should import CancelComponent without crashing', () => {
      expect(() => require('@/components/public-meeting/CancelComponent')).not.toThrow()
    })

    it('should import CheckoutWidgetModal without crashing', () => {
      expect(() => require('@/components/public-meeting/CheckoutWidgetModal')).not.toThrow()
    })

    it('should import ConfirmPaymentInfo without crashing', () => {
      expect(() => require('@/components/public-meeting/ConfirmPaymentInfo')).not.toThrow()
    })

    it('should import FiatPaymentVerifying without crashing', () => {
      expect(() => require('@/components/public-meeting/FiatPaymentVerifying')).not.toThrow()
    })

    it('should import FormerTimeInfo without crashing', () => {
      expect(() => require('@/components/public-meeting/FormerTimeInfo')).not.toThrow()
    })

    it('should import HeadMeta without crashing', () => {
      expect(() => require('@/components/public-meeting/HeadMeta')).not.toThrow()
    })

    it('should import MakeYourPayment without crashing', () => {
      expect(() => require('@/components/public-meeting/MakeYourPayment')).not.toThrow()
    })

    it('should import PaidMeetings without crashing', () => {
      expect(() => require('@/components/public-meeting/PaidMeetings')).not.toThrow()
    })

    it('should import PayViaInvoice without crashing', () => {
      expect(() => require('@/components/public-meeting/PayViaInvoice')).not.toThrow()
    })

    it('should import PaymentComponent without crashing', () => {
      expect(() => require('@/components/public-meeting/PaymentComponent')).not.toThrow()
    })

    it('should import PaymentDetails without crashing', () => {
      expect(() => require('@/components/public-meeting/PaymentDetails')).not.toThrow()
    })

    it('should import ProgressHeader without crashing', () => {
      expect(() => require('@/components/public-meeting/ProgressHeader')).not.toThrow()
    })

    it('should import ProgressHeaderItem without crashing', () => {
      expect(() => require('@/components/public-meeting/ProgressHeaderItem')).not.toThrow()
    })

    it('should import SchedulerPicker without crashing', () => {
      expect(() => require('@/components/public-meeting/SchedulerPicker')).not.toThrow()
    })

    it('should import SelectCryptoNetwork without crashing', () => {
      expect(() => require('@/components/public-meeting/SelectCryptoNetwork')).not.toThrow()
    })

    it('should import SessionTypeCardPaymentInfo without crashing', () => {
      expect(() => require('@/components/public-meeting/SessionTypeCardPaymentInfo')).not.toThrow()
    })

    it('should import TimeNotAvailableWarning without crashing', () => {
      expect(() => require('@/components/public-meeting/TimeNotAvailableWarning')).not.toThrow()
    })

    it('should import index without crashing', () => {
      expect(() => require('@/components/public-meeting/index')).not.toThrow()
    })
  })
})
