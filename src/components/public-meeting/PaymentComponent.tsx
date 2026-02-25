import { VStack } from '@chakra-ui/react'
import ConfirmPaymentInfo from '@components/public-meeting/ConfirmPaymentInfo'
import { PublicScheduleContext } from '@components/public-meeting/index'
import MakeYourPayment from '@components/public-meeting/MakeYourPayment'
import PayViaInvoice from '@components/public-meeting/PayViaInvoice'
import ProgressHeader from '@components/public-meeting/ProgressHeader'
import SelectCryptoNetwork from '@components/public-meeting/SelectCryptoNetwork'
import SessionTypeCardPaymentInfo from '@components/public-meeting/SessionTypeCardPaymentInfo'
import { PaymentStep } from '@utils/constants/meeting-types'
import { useRouter } from 'next/router'
import React, { useContext } from 'react'

import FiatPaymentVerifying from './FiatPaymentVerifying'

const PaymentComponent = () => {
  const { paymentStep } = useContext(PublicScheduleContext)
  const _router = useRouter()
  const renderPage = () => {
    switch (paymentStep) {
      case PaymentStep.CONFIRM_PAYMENT:
        return <ConfirmPaymentInfo />
      case PaymentStep.SELECT_CRYPTO_NETWORK:
        return <SelectCryptoNetwork />
      case PaymentStep.FIAT_PAYMENT_VERIFYING:
        return <FiatPaymentVerifying />
      case PaymentStep.HANDLE_SEND_INVOICE:
        return <PayViaInvoice />

      case PaymentStep.SELECT_PAYMENT_METHOD:
      default:
        return <MakeYourPayment />
    }
  }
  return (
    <VStack
      w={{ base: '100%', md: '85%', lg: '60%' }}
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
