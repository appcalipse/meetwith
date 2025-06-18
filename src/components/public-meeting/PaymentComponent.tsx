import { VStack } from '@chakra-ui/react'
import ConfirmPaymentInfo from '@components/public-meeting/ConfirmPaymentInfo'
import { PublicScheduleContext } from '@components/public-meeting/index'
import MakeYourPayment from '@components/public-meeting/MakeYourPayment'
import ProgressHeader from '@components/public-meeting/ProgressHeader'
import SessionTypeCardPaymentInfo from '@components/public-meeting/SessionTypeCardPaymentInfo'
import { PaymentStep } from '@utils/constants/meeting-types'
import React, { useContext } from 'react'

const PaymentComponent = () => {
  const { paymentStep } = useContext(PublicScheduleContext)

  const renderPage = () => {
    switch (paymentStep) {
      case PaymentStep.CONFIRM_PAYMENT:
        return <ConfirmPaymentInfo />
      case PaymentStep.SELECT_CRYPTO_NETWORK:
        return null
      case PaymentStep.FIAT_PAYMENT_VERIFYING:
        return null

      case PaymentStep.SELECT_PAYMENT_METHOD:
      default:
        return <MakeYourPayment />
    }
  }
  return (
    <VStack
      w={{ base: '100%', md: '80%', lg: '60%' }}
      alignItems={{ md: 'flex-start', base: 'center' }}
      marginX={'auto'}
      px={'4'}
      gap={9}
    >
      <ProgressHeader />
      <SessionTypeCardPaymentInfo />
      {renderPage()}
    </VStack>
  )
}

export default PaymentComponent
