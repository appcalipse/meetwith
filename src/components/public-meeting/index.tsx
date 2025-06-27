import { Container, Flex, useColorModeValue, VStack } from '@chakra-ui/react'
import MeetingScheduledDialog from '@components/meeting/MeetingScheduledDialog'
import BasePage from '@components/public-meeting/BasePage'
import BookingComponent from '@components/public-meeting/BookingComponent'
import HeadMeta from '@components/public-meeting/HeadMeta'
import PaymentComponent from '@components/public-meeting/PaymentComponent'
import { MeetingType, PublicAccount } from '@meta/Account'
import { MeetingDecrypted, SchedulingType } from '@meta/Meeting'
import {
  PaymentStep,
  PaymentType,
  PublicSchedulingSteps,
} from '@utils/constants/meeting-types'
import { useRouter } from 'next/router'
import React, { FC, useEffect, useMemo, useState } from 'react'

import { AcceptedToken, SupportedChain } from '@/types/chains'
import { Address } from '@/types/Transactions'
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
  setCurrentStep: React.Dispatch<React.SetStateAction<PublicSchedulingSteps>>
  paymentType?: PaymentType
  setPaymentType: React.Dispatch<React.SetStateAction<PaymentType | undefined>>
  paymentStep?: PaymentStep
  setPaymentStep: React.Dispatch<React.SetStateAction<PaymentStep | undefined>>
  handleSelectPaymentMethod: (
    type: PaymentType,
    step: PaymentStep
  ) => Promise<void>
  chain?: SupportedChain
  setChain: React.Dispatch<React.SetStateAction<SupportedChain | undefined>>
  token?: AcceptedToken
  setToken: React.Dispatch<React.SetStateAction<AcceptedToken | undefined>>
  handleSetTokenAndChain: (
    token?: AcceptedToken,
    chain?: SupportedChain
  ) => void
  tx?: Address
  handleNavigateToBook: (tx: Address) => void
  schedulingType: SchedulingType
  setSchedulingType: React.Dispatch<React.SetStateAction<SchedulingType>>
  lastScheduledMeeting: MeetingDecrypted | undefined
  setLastScheduledMeeting: React.Dispatch<
    React.SetStateAction<MeetingDecrypted | undefined>
  >
  hasConnectedCalendar: boolean
  setHasConnectedCalendar: React.Dispatch<React.SetStateAction<boolean>>
  notificationsSubs: number
  setNotificationSubs: React.Dispatch<React.SetStateAction<number>>
  isContact: boolean
  setIsContact: React.Dispatch<React.SetStateAction<boolean>>
}
const baseState: IContext = {
  account: {} as PublicAccount,
  selectedType: null,
  handleSetSelectedType: async () => {},
  currentStep: PublicSchedulingSteps.SELECT_TYPE,
  setCurrentStep: () => {},
  paymentType: undefined,
  setPaymentType: async () => {},
  paymentStep: PaymentStep.SELECT_PAYMENT_METHOD,
  setPaymentStep: async () => {},
  handleSelectPaymentMethod: async () => {},
  chain: undefined,
  setChain: () => {},
  token: undefined,
  setToken: () => {},
  handleSetTokenAndChain: async () => {},
  tx: undefined,
  handleNavigateToBook: () => {},
  schedulingType: SchedulingType.REGULAR,
  setSchedulingType: () => {},
  lastScheduledMeeting: undefined,
  setLastScheduledMeeting: () => {},
  hasConnectedCalendar: false,
  setHasConnectedCalendar: () => {},
  notificationsSubs: 0,
  setNotificationSubs: () => {},
  isContact: false,
  setIsContact: () => {},
}
export const PublicScheduleContext = React.createContext<IContext>(baseState)
const PublicPage: FC<IProps> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const { query, push, isReady, beforePopState, replace, asPath } = useRouter()
  const [schedulingType, setSchedulingType] = useState(SchedulingType.REGULAR)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState<
    MeetingDecrypted | undefined
  >(undefined)
  const [hasConnectedCalendar, setHasConnectedCalendar] = useState(false)
  const [notificationsSubs, setNotificationSubs] = useState(0)
  const [isContact, setIsContact] = useState(false)

  const selectedType = useMemo(() => {
    if (!isReady) return null
    const meeting_type = Array.isArray(query.address)
      ? query.address.at(-1)
      : undefined
    return (
      props.account?.meetingTypes?.find(t => t.slug === meeting_type) || null
    )
  }, [query.address, props.account, isReady])
  const [token, setToken] = useState<AcceptedToken | undefined>(undefined)
  const [chain, setChain] = useState<SupportedChain | undefined>(undefined)
  const [paymentType, setPaymentType] = useState<PaymentType | undefined>(
    undefined
  )
  const [paymentStep, setPaymentStep] = useState<PaymentStep | undefined>(
    undefined
  )
  const [tx, setTx] = useState<Address | undefined>(undefined)
  const [currentStep, setCurrentStep] = useState<PublicSchedulingSteps>(
    PublicSchedulingSteps.SELECT_TYPE
  )
  const handleNavigateToBook = (tx?: Address) => {
    setTx(tx)
    setCurrentStep(PublicSchedulingSteps.BOOK_SESSION)
  }

  const handleSetTokenAndChain = (
    token?: AcceptedToken,
    chain?: SupportedChain
  ) => {
    setToken(token)
    setChain(chain)
  }

  const handleSelectPaymentMethod = async (
    type: PaymentType,
    step: PaymentStep
  ) => {
    setPaymentType(type)
    setPaymentStep(step)
  }
  const handleSetSelectedType = async (
    type: MeetingType,
    current_step: PublicSchedulingSteps
  ) => {
    await push({
      pathname: `/${getAccountDomainUrl(props.account!)}/${type.slug}`,
    })
    setCurrentStep(current_step)
  }
  useEffect(() => {
    if (!isReady) return
    const meeting_type = Array.isArray(query.address)
      ? query.address.at(-1)
      : undefined
    if (meeting_type) {
      const type = props.account?.meetingTypes?.find(
        t => t.slug === meeting_type
      )
      if (type) {
        const nextStep = type?.plan
          ? PublicSchedulingSteps.PAY_FOR_SESSION
          : PublicSchedulingSteps.BOOK_SESSION

        // Use immediate push for initial step determination
        setCurrentStep(nextStep)
      }
    }
  }, [query.address])

  useEffect(() => {
    const handleBackButton = () => {
      if (currentStep !== PublicSchedulingSteps.SELECT_TYPE) {
        switch (currentStep) {
          case PublicSchedulingSteps.BOOK_SESSION:
            if (selectedType?.plan && paymentStep) {
              setCurrentStep(PublicSchedulingSteps.PAY_FOR_SESSION)
              replace(asPath, undefined, { shallow: true })
            } else {
              setCurrentStep(PublicSchedulingSteps.SELECT_TYPE)
            }
            break
          case PublicSchedulingSteps.PAY_FOR_SESSION:
            setCurrentStep(PublicSchedulingSteps.SELECT_TYPE)
            break
        }
        return false
      }

      return true
    }

    beforePopState(handleBackButton)

    return () => {
      beforePopState(() => true)
    }
  }, [currentStep, selectedType, beforePopState])

  const _onClose = () => {
    setLastScheduledMeeting(undefined)
  }
  const context: IContext = {
    account: props.account,
    selectedType,
    handleSetSelectedType,
    currentStep: currentStep || PublicSchedulingSteps.SELECT_TYPE,
    setCurrentStep,
    paymentType,
    setPaymentType,
    paymentStep,
    setPaymentStep,
    handleSelectPaymentMethod,
    chain,
    setChain,
    token,
    setToken,
    handleSetTokenAndChain,
    tx,
    handleNavigateToBook,
    schedulingType,
    setSchedulingType,
    lastScheduledMeeting,
    setLastScheduledMeeting,
    hasConnectedCalendar,
    setHasConnectedCalendar,
    notificationsSubs,
    setNotificationSubs,
    isContact,
    setIsContact,
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
          mt={{ md: 36, base: 0 }}
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
          {lastScheduledMeeting ? (
            <Flex justify="center">
              <MeetingScheduledDialog
                participants={lastScheduledMeeting!.participants}
                hostAccount={props.account}
                scheduleType={schedulingType}
                meeting={lastScheduledMeeting}
                accountNotificationSubs={notificationsSubs}
                hasConnectedCalendar={hasConnectedCalendar}
                isContact={isContact}
                setIsContact={setIsContact}
                reset={_onClose}
              />
            </Flex>
          ) : (
            renderStep()
          )}
        </Container>
      </VStack>
    </PublicScheduleContext.Provider>
  )
}

export default PublicPage
