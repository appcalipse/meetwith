import { Container, useColorModeValue, VStack } from '@chakra-ui/react'
import BasePage from '@components/public-meeting/BasePage'
import BookingComponent from '@components/public-meeting/BookingComponent'
import HeadMeta from '@components/public-meeting/HeadMeta'
import PaymentComponent from '@components/public-meeting/PaymentComponent'
import { MeetingType, PublicAccount } from '@meta/Account'
import {
  PaymentStep,
  PaymentType,
  PublicSchedulingSteps,
} from '@utils/constants/meeting-types'
import { useRouter } from 'next/router'
import React, { FC, useEffect } from 'react'

import { getAccountDomainUrl } from '@/utils/calendar_manager'

interface IProps {
  account: PublicAccount
  url: string
}

interface IContext {
  account: PublicAccount
  selectedType: MeetingType | null
  handleSetSelectedType: (
    type: MeetingType,
    step: PublicSchedulingSteps
  ) => Promise<void>
  currentStep: PublicSchedulingSteps
  setCurrentStep: (step: PublicSchedulingSteps) => void
  paymentType?: PaymentType
  setPaymentType: (type: PaymentType | null) => void
  paymentStep?: PaymentStep
  setPaymentStep: (step: PaymentStep) => void
  handleSelectPaymentMethod: (type: PaymentType, step: PaymentStep) => void
}
const baseState: IContext = {
  account: {} as PublicAccount,
  selectedType: null,
  handleSetSelectedType: async (
    type: MeetingType,
    step: PublicSchedulingSteps
  ) => {},
  currentStep: PublicSchedulingSteps.SELECT_TYPE,
  setCurrentStep: () => {},
  paymentType: undefined,
  setPaymentType: () => {},
  paymentStep: PaymentStep.SELECT_PAYMENT_METHOD,
  setPaymentStep: () => {},
  handleSelectPaymentMethod: () => {},
}
export const PublicScheduleContext = React.createContext<IContext>(baseState)
const PublicPage: FC<IProps> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [selectedType, setSelectedType] = React.useState<MeetingType | null>(
    null
  )

  const { query, pathname, push } = useRouter()
  const {
    payment_step,
    current_step: currentStep,
    meeting_type,
    payment_type,
  } = query as {
    payment_step?: PaymentStep
    current_step?: PublicSchedulingSteps
    meeting_type?: string
    payment_type?: PaymentType
  }
  const setPaymentStep = (step: PaymentStep) => {
    push(
      {
        pathname,
        query: { ...query, payment_step: step },
      },
      undefined,
      { shallow: true }
    )
  }
  const setCurrentStep = (step: PublicSchedulingSteps) => {
    push(
      {
        pathname,
        query: { ...query, current_step: step },
      },
      undefined,
      { shallow: true }
    )
  }
  const setPaymentType = (type: PaymentType | null) => {
    push(
      {
        pathname,
        query: { ...query, payment_type: type },
      },
      undefined,
      { shallow: true }
    )
  }
  const handleSelectPaymentMethod = (type: PaymentType, step: PaymentStep) => {
    push(
      {
        pathname,
        query: { ...query, payment_type: type, payment_step: step },
      },
      undefined,
      { shallow: true }
    )
  }
  const handleSetSelectedType = async (
    type: MeetingType,
    current_step: PublicSchedulingSteps
  ) => {
    setSelectedType(type)
    await push(
      {
        pathname: `/${getAccountDomainUrl(props.account!)}/${type.slug}`,
        query: { ...query, current_step },
      },
      undefined,
      { shallow: true }
    )
  }
  useEffect(() => {
    const meeting_type = Array.isArray(query.address)
      ? query.address[1]
      : undefined
    if (meeting_type) {
      const type = props.account?.meetingTypes?.find(
        t => t.slug === meeting_type
      )
      if (type) {
        setSelectedType(type)
      }
    }
  }, [query.address])
  const context: IContext = {
    account: props.account,
    selectedType,
    handleSetSelectedType,
    currentStep: currentStep || PublicSchedulingSteps.SELECT_TYPE,
    setCurrentStep,
    paymentType: payment_type,
    setPaymentType,
    paymentStep: payment_step,
    setPaymentStep,
    handleSelectPaymentMethod,
  }
  const renderStep = () => {
    switch (currentStep) {
      case PublicSchedulingSteps.PAY_FOR_SESSION:
        return <PaymentComponent />
      case PublicSchedulingSteps.BOOK_SESSION:
        return <BookingComponent />
      case PublicSchedulingSteps.SELECT_TYPE:
      default:
        return <BasePage />
    }
  }
  return (
    <PublicScheduleContext.Provider value={context}>
      <HeadMeta account={props.account} url={props.url} />
      <VStack mb={36} gap={1}>
        <Container
          bg={bgColor}
          maxW={{ base: '100%', md: '95%' }}
          mt={{ md: 48, base: 0 }}
          pt={{ base: 36, md: 20 }}
          flex={1}
          width={'100%'}
          pb={24}
          marginX="auto"
          borderRadius="lg"
          transitionProperty="width"
          transitionDuration="2s"
          transitionTimingFunction="ease-in-out"
          position={'relative'}
        >
          {renderStep()}
        </Container>
      </VStack>
    </PublicScheduleContext.Provider>
  )
}

export default PublicPage
