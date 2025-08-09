import {
  Container,
  Flex,
  HStack,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import MeetingScheduledDialog from '@components/meeting/MeetingScheduledDialog'
import BasePage from '@components/public-meeting/BasePage'
import BookingComponent from '@components/public-meeting/BookingComponent'
import HeadMeta from '@components/public-meeting/HeadMeta'
import PaymentComponent from '@components/public-meeting/PaymentComponent'
import { MeetingType, PublicAccount } from '@meta/Account'
import {
  ConferenceMeeting,
  MeetingDecrypted,
  SchedulingType,
} from '@meta/Meeting'
import {
  PaymentStep,
  PaymentType,
  PublicSchedulingSteps,
} from '@utils/constants/meeting-types'
import { useRouter } from 'next/router'
import React, { FC, useEffect, useMemo, useState } from 'react'
import { v4 } from 'uuid'

import useAccountContext from '@/hooks/useAccountContext'
import { AcceptedToken, SupportedChain } from '@/types/chains'
import { Address } from '@/types/Transactions'
import { getMeetingGuest } from '@/utils/api_helper'
import { getAccountDomainUrl } from '@/utils/calendar_manager'
import { Option } from '@/utils/constants/select'
import { decryptContent } from '@/utils/cryptography'
import { timezones } from '@/utils/date_helper'
import { isJson } from '@/utils/generic_utils'
import { ParticipantInfoForNotification } from '@/utils/notification_helper'

import Loading from '../Loading'
const tzs = timezones.map(tz => {
  return {
    value: String(tz.tzCode),
    label: tz.name,
  }
})
interface IProps {
  account: PublicAccount
  url: string
}
export type RescheduleConferenceData = ConferenceMeeting & {
  participants?: Array<ParticipantInfoForNotification>
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
  rescheduleSlot?: RescheduleConferenceData
  rescheduleSlotLoading: boolean
  meetingSlotId?: string
  timezone: Option<string>
  setTimezone: React.Dispatch<React.SetStateAction<Option<string>>>
  setIsCancelled: React.Dispatch<React.SetStateAction<boolean>>
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
  rescheduleSlot: undefined,
  rescheduleSlotLoading: false,
  meetingSlotId: undefined,
  timezone: tzs[0],
  setTimezone: () => {},
  setIsCancelled: () => {},
}

export const PublicScheduleContext = React.createContext<IContext>(baseState)
const PublicPage: FC<IProps> = props => {
  const bgColor = useColorModeValue('white', 'neutral.900')
  const { query, push, isReady, beforePopState, replace, asPath } = useRouter()
  const [pageGettingReady, setPageGettingReady] = useState(true)
  const [schedulingType, setSchedulingType] = useState(SchedulingType.REGULAR)
  const [lastScheduledMeeting, setLastScheduledMeeting] = useState<
    MeetingDecrypted | undefined
  >(undefined)
  const { slotId, metadata, slot } = query
  const [hasConnectedCalendar, setHasConnectedCalendar] = useState(false)
  const [meetingSlotId, setMeetingSlotId] = useState<string | undefined>(
    undefined
  )
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
  const currentAccount = useAccountContext()

  const [timezone, setTimezone] = useState<Option<string>>(
    tzs.find(
      val =>
        val.value ===
        (currentAccount?.preferences?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone)
    ) || tzs[0]
  )
  const [paymentStep, setPaymentStep] = useState<PaymentStep | undefined>(
    undefined
  )
  const [tx, setTx] = useState<Address | undefined>(undefined)
  const [key, setKey] = useState<string | undefined>(v4())
  const [isCancelled, setIsCancelled] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<PublicSchedulingSteps>(
    PublicSchedulingSteps.SELECT_TYPE
  )
  const toast = useToast()
  const [rescheduleSlot, setRescheduleSlot] = useState<
    ConferenceMeeting | undefined
  >(undefined)
  const [rescheduleSlotLoading, setRescheduleSlotLoading] =
    useState<boolean>(false)
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
      query: {
        ...query,
        address: undefined, // Clear address to avoid confusion
      },
    })
    setCurrentStep(current_step)
  }

  const getSlotInfo = async () => {
    const baseId = slot || slotId
    const rescheduleSlotId = Array.isArray(baseId) ? baseId[0] : baseId
    if (rescheduleSlotId) {
      setRescheduleSlotLoading(true)
      try {
        const meeting: RescheduleConferenceData = await getMeetingGuest(
          rescheduleSlotId
        )
        if (!meeting) {
          toast({
            title: 'Meeting not found',
            status: 'error',
            description:
              'The meeting you are trying to reschedule was not found.',
          })
          await push('/404')
          return
        }
        if (metadata) {
          const guestParticipants = decryptContent(
            process.env.NEXT_PUBLIC_SERVER_PUB_KEY!,
            Array.isArray(metadata) ? metadata[0] : metadata
          )
          if (guestParticipants) {
            meeting.participants = isJson(guestParticipants)
              ? (JSON.parse(
                  guestParticipants
                ) as Array<ParticipantInfoForNotification>)
              : undefined
          }
          const actor = meeting.participants?.find(
            p => p.slot_id === meetingSlotId
          )
          if (actor) {
            setTimezone(
              tzs.find(
                val =>
                  val.value ===
                  (actor.timezone ||
                    currentAccount?.preferences?.timezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone)
              ) || tzs[0]
            )
          }
        }
        setMeetingSlotId(rescheduleSlotId)
        setRescheduleSlot(meeting)
      } catch (error) {
        toast({
          title: 'Unable to load meeting details',
          status: 'error',
          description:
            'The meeting information could not be retrieved. Please try again.',
        })

        setRescheduleSlot(undefined)
      }
      setRescheduleSlotLoading(false)
    }
  }
  useEffect(() => {
    if (!isReady) return
    setPageGettingReady(true)
    if (query.address) {
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
    }
    if (query.payment_type) {
      const paymentType = query.payment_type as PaymentType
      setPaymentType(paymentType)
      setPaymentStep(PaymentStep.CONFIRM_PAYMENT)
      if (paymentType === PaymentType.CRYPTO) {
        const { chain, token } = query as {
          chain?: SupportedChain
          token?: AcceptedToken
        }
        if (typeof chain === 'string' && typeof token === 'string') {
          setChain(chain)
          setToken(token)
        }
      }
    }

    void getSlotInfo()
    setPageGettingReady(false)
  }, [query])
  useEffect(() => {}, [])

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

  const _onClose = async () => {
    await push({
      pathname: `/${getAccountDomainUrl(props.account!)}/${selectedType?.slug}`,
    })
    setLastScheduledMeeting(undefined)
    setKey(v4())
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
    rescheduleSlot,
    rescheduleSlotLoading,
    meetingSlotId,
    timezone,
    setTimezone,
    setIsCancelled,
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
      <VStack mb={36} gap={1} key={key}>
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
                participants={lastScheduledMeeting?.participants}
                hostAccount={props.account}
                scheduleType={schedulingType}
                meeting={lastScheduledMeeting}
                accountNotificationSubs={notificationsSubs}
                hasConnectedCalendar={hasConnectedCalendar}
                isContact={isContact}
                setIsContact={setIsContact}
                reset={_onClose}
                isReschedule={!!meetingSlotId}
                isCancelled={isCancelled}
                timezone={
                  timezone?.value ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone
                }
              />
            </Flex>
          ) : pageGettingReady ? (
            <HStack w="100%" mt={8} mx="auto" justifyContent="center">
              <Loading label="Loading..." />
            </HStack>
          ) : (
            renderStep()
          )}
        </Container>
      </VStack>
    </PublicScheduleContext.Provider>
  )
}

export default PublicPage
