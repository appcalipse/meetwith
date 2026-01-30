'use client'

import {
  Box,
  Button,
  Circle,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalContent,
  ModalOverlay,
  Switch,
  Text,
  useColorModeValue,
  useSteps,
  useToast,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { FaApple, FaGoogle, FaMicrosoft } from 'react-icons/fa'
import JoinPollConfirmModal from '@/components/quickpoll/JoinPollConfirmModal'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { TimeRange } from '@/types/Account'
import { NotificationChannel } from '@/types/AccountNotifications'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { EditMode } from '@/types/Dashboard'
import { DiscordUserInfo } from '@/types/Discord'
import { TimeSlotSource } from '@/types/Meeting'
import { QuickPollJoinContext } from '@/types/QuickPoll'
import { logEvent } from '@/utils/analytics'
import {
  getGoogleAuthConnectUrl,
  getOffice365ConnectUrl,
  internalFetch,
  joinQuickPollAsParticipant,
  listConnectedCalendars,
  saveAccountChanges,
  setNotificationSubscriptions,
  updateAvailabilityBlock,
  updateAvailabilityBlockMeetingTypes,
  updateConnectedCalendar,
} from '@/utils/api_helper'
import { generateDefaultAvailabilities } from '@/utils/calendar_manager'
import { OnboardingSubject } from '@/utils/constants'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import {
  clearQuickPollSignInContext,
  getQuickPollSignInContext,
} from '@/utils/storage'
import { useToastHelpers } from '@/utils/toasts'
import { isValidEmail } from '@/utils/validations'
import WebDavDetailsPanel from '../ConnectedCalendars/WebDavCalendarDetail'
import TimezoneSelector from '../TimezoneSelector'
import { OnboardingAvailabilityStep } from './OnboardingAvailabilityStep'

const OnboardingModal = () => {
  const router = useRouter()

  // Callback Control
  const queryParams = useSearchParams()
  const state = queryParams.get('calState') ?? queryParams.get('state')
  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state as string, 'base64').toString())
      : {}
  const origin = stateObject.origin as OnboardingSubject | undefined
  const skipNextSteps = stateObject.skipNextSteps as boolean | undefined
  const [signedUp, setSignedUp] = useState<string>(
    stateObject.signedUp || false
  )
  const [name, setName] = useState<string>(stateObject.name || '')
  const [email, setEmail] = useState<string>(stateObject.email || '')

  const [timezone, setTimezone] = useState<string | undefined | null>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  const [didOpenConnectWallet, setDidOpenConnectWallet] = useState(false)
  const [showJoinPollConfirmation, setShowJoinPollConfirmation] =
    useState(false)
  const [pollContextForConfirmation, setPollContextForConfirmation] =
    useState<QuickPollJoinContext | null>(null)

  // Color Control
  const bgColor = useColorModeValue('gray.100', 'gray.600')
  const avatarBg = useColorModeValue('gray.700', 'gray.500')
  const textColor = useColorModeValue('neutral.600', 'neutral.200')

  // Onboarding Modal Control
  // const { isOpen, onOpen: onOpenOnboardingModal, onClose } = useDisclosure()

  // Wallet Modal Control
  const {
    openConnection,
    isOnboardingOpened,
    openOnboarding,
    closeOnboarding,
    onboardingInit,
    onboardingStarted,
  } = useContext(OnboardingModalContext)
  const {
    activeStep,
    goToNext: goToNextStep,
    goToPrevious: goToPreviousStep,
    setActiveStep,
  } = useSteps({
    index: 0,
    count: 2,
  })

  // User Control

  const { currentAccount, login } = useContext(AccountContext)

  // Availability form state for onboarding
  const [availabilityFormState, setAvailabilityFormState] = useState({
    title: 'Default',
    timezone: timezone,
    availabilities: generateDefaultAvailabilities(),
    isDefault: true,
  })

  const [selectedMeetingTypeIds, setSelectedMeetingTypeIds] = useState<
    string[]
  >([])

  // Modal opening flow
  useEffect(() => {
    const isStandaloneAuthPage =
      router.pathname === '/reset-pin' ||
      router.pathname === '/change-email' ||
      router.pathname === '/enable-pin'

    // When something related to user changes, check if we should open the modal
    // If the user is logged in and modal hans't been opened yet
    if (
      !!currentAccount?.address &&
      !onboardingInit &&
      !skipNextSteps &&
      !isStandaloneAuthPage
    ) {
      // We check if the user is comming from Discord Onboarding Modal
      // and has its discord account linked

      // 1st Case
      // Connected Discord in Modal Successfully
      if (
        origin === OnboardingSubject.DiscordConnectedInModal &&
        !!currentAccount.discord_account
      ) {
        openOnboarding()
        onboardingStarted()

        // 2nd Case
        // Connect Google Calendar or Office 365 Calendar in Modal
      } else if (
        origin === OnboardingSubject.GoogleCalendarConnected ||
        origin === OnboardingSubject.Office365CalendarConnected
      ) {
        setActiveStep(1)
        openOnboarding()
        onboardingStarted()

        // 3rd Case
        // Don't have any origin, just created Account
      } else if (!origin && signedUp) {
        openOnboarding()
        onboardingStarted()
      }
    }
    // If not, we check if any origin is passed in and if the user its not logged in
    // and connection modal is not open this way we will trigger the wallet connection
    // modal
    else if (
      !currentAccount?.address &&
      !!origin &&
      !didOpenConnectWallet &&
      !isOnboardingOpened &&
      !isStandaloneAuthPage
    ) {
      // We open the connection modal and avoid it being opened again
      openConnection()
      setDidOpenConnectWallet(true)
    }
  }, [
    currentAccount,
    openOnboarding,
    origin,
    openConnection,
    isOnboardingOpened,
    signedUp,
    router.pathname,
  ])

  useEffect(() => {
    if (stateObject.name && !name) {
      setName(stateObject.name)
    }
    if (stateObject.email && !email) {
      setEmail(stateObject.email)
    }
    if (stateObject.signedUp && !signedUp) {
      setSignedUp(stateObject.signedUp)
    }
  }, [queryParams])

  // Discord Step
  async function fillDiscordUserInfo() {
    if (!!currentAccount?.preferences?.name) {
      setName(currentAccount?.preferences?.name)
      return
    }

    if (currentAccount) {
      const discordUserInfo = await queryClient.fetchQuery(
        QueryKeys.discordUserInfo(currentAccount?.address),
        async () => {
          const data = (await internalFetch('/secure/discord/info')) as
            | DiscordUserInfo
            | undefined
          return data ?? null
        }
      )

      if (discordUserInfo?.global_name) setName(discordUserInfo.global_name)
    }
  }

  useEffect(() => {
    if (isOnboardingOpened === true) fillDiscordUserInfo()
  }, [isOnboardingOpened])

  const toast = useToast()

  function validateFirstStep() {
    if (!timezone) {
      toast({
        title: 'Missing timezone',
        description: 'Please choose a timezone',
        status: 'error',
        position: 'top',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    if (!name) {
      toast({
        title: 'Name is required',
        description: "Please insert a name. Doesn't need to be your real one",
        status: 'error',
        position: 'top',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    if (email && !isValidEmail(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please insert a valid email',
        status: 'error',
        position: 'top',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    goToNextStep()
  }

  // Calendar Connection Functions
  async function onConnectGoogleCalendar() {
    stateObject.name = name
    stateObject.email = email
    stateObject.timezone = timezone

    const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
      'base64'
    )

    const response = await getGoogleAuthConnectUrl(newState64)
    response && window.location.assign(response.url)
  }

  async function onConnectOfficeCalendar() {
    stateObject.name = name
    stateObject.email = email
    stateObject.timezone = timezone

    const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
      'base64'
    )

    const response = await getOffice365ConnectUrl(newState64)
    response && window.location.assign(response.url)
  }

  // Calendar Buttons Behavior
  const [isAppleCalDavOpen, setIsAppleCalDavOpen] = useState(false)
  const [isCalDavOpen, setIsCalDavOpen] = useState(false)

  // Data Control over Calendar Connections
  const [calendarConnections, setCalendarConnections] = useState<
    ConnectedCalendarCore[]
  >([])

  const {
    data: calendarConnectionsData,
    isFetching: isFetchingCalendarConnections,
    refetch: refetchCalendarConnections,
  } = useQuery({
    queryKey: ['calendars'],
    enabled: activeStep === 1,
    queryFn: () => listConnectedCalendars(),
  })

  function getGoogleCalendar() {
    return calendarConnections.find(
      calendar => calendar.provider === TimeSlotSource.GOOGLE
    )
  }

  function getOfficeCalendar() {
    return calendarConnections.find(
      calendar => calendar.provider === TimeSlotSource.OFFICE
    )
  }

  function getAppleCalendar() {
    return calendarConnections.find(
      calendar => calendar.provider === TimeSlotSource.ICLOUD
    )
  }

  function getDavCalendar() {
    return calendarConnections.find(
      calendar => calendar.provider === TimeSlotSource.WEBDAV
    )
  }

  function hasCalendar() {
    return (
      !!getGoogleCalendar() ||
      !!getOfficeCalendar() ||
      !!getAppleCalendar() ||
      !!getDavCalendar()
    )
  }

  useEffect(() => {
    setCalendarConnections(calendarConnectionsData ?? [])
  }, [calendarConnectionsData])

  async function toggleCalendar(
    calendar?: ConnectedCalendarCore,
    index?: number
  ) {
    if (!calendar || index === undefined || index === null) return
    const newCalendarObject: ConnectedCalendarCore = calendar
    newCalendarObject.calendars[index] = {
      ...newCalendarObject.calendars[index],
      enabled: !newCalendarObject.calendars[index].enabled,
    }

    const newConnections: ConnectedCalendarCore[] = calendarConnections.filter(
      connection => connection.provider !== calendar.provider
    )
    newConnections.push(newCalendarObject)

    setCalendarConnections(newConnections)

    await updateConnectedCalendar(
      calendar.email,
      calendar.provider,
      calendar.calendars
    )
    queryClient.invalidateQueries(['calendars'])
  }

  useEffect(() => {
    if (!currentAccount?.preferences) return
    setTimezone(currentAccount.preferences.timezone)
  }, [currentAccount?.address])

  // Availability form handlers
  const handleAvailabilityTitleChange = (title: string) => {
    setAvailabilityFormState(prev => ({ ...prev, title }))
  }

  const handleAvailabilityTimezoneChange = (
    timezone: string | null | undefined
  ) => {
    setAvailabilityFormState(prev => ({ ...prev, timezone }))
  }

  const handleAvailabilityChange = (
    day: number,
    ranges: TimeRange[] | null
  ) => {
    setAvailabilityFormState(prev => {
      const newAvailabilities = prev.availabilities.map(availability => {
        if (availability.weekday === day) {
          return { weekday: day, ranges: ranges ?? [] }
        }
        return availability
      })
      return {
        ...prev,
        availabilities: newAvailabilities,
      }
    })
  }

  const handleMeetingTypesChange = (meetingTypeIds: string[]) => {
    setSelectedMeetingTypeIds(meetingTypeIds)
  }

  const [loadingSave, setLoadingSave] = useState(false)

  async function onSave() {
    if (!currentAccount?.preferences || !timezone) return

    setLoadingSave(true)

    try {
      // default type is generated at account creation so no need to check for it here
      const defaultBlockId = currentAccount.preferences?.availaibility_id
      if (defaultBlockId) {
        await updateAvailabilityBlock({
          id: defaultBlockId,
          title: availabilityFormState.title,
          timezone: availabilityFormState.timezone || 'UTC',
          weekly_availability: availabilityFormState.availabilities,
          is_default: true,
        })

        if (selectedMeetingTypeIds.length > 0) {
          await updateAvailabilityBlockMeetingTypes({
            availability_block_id: defaultBlockId,
            meeting_type_ids: selectedMeetingTypeIds,
          })
        }
      }

      const updatedAccount = await saveAccountChanges({
        ...currentAccount,
        preferences: {
          ...currentAccount.preferences,
          name: name,
          timezone,
        },
      })
      try {
        if (!!email)
          await setNotificationSubscriptions(
            {
              account_address: currentAccount.address,
              notification_types: [
                {
                  channel: NotificationChannel.EMAIL,
                  destination: email,
                  disabled: false,
                },
              ],
            },
            stateObject.jti
          )
      } catch (_e) {
        toast({
          title: 'Error setting email',
          description:
            'There was an error while trying to set your email. Please, check your email preferences in your profile after closing this modal',
          status: 'error',
          position: 'top',
          duration: 8000,
          isClosable: true,
        })
      }
      logEvent('Updated account details')
      login(updatedAccount)

      const pollContext = getQuickPollSignInContext()

      if (pollContext) {
        setPollContextForConfirmation({
          pollId: pollContext.pollId,
          pollSlug: pollContext.pollSlug,
          pollTitle: pollContext.pollTitle,
        })
        setShowJoinPollConfirmation(true)
        setLoadingSave(false)
        closeOnboarding()
        return
      }

      await router.push(
        !!stateObject.redirect
          ? `/dashboard/${EditMode.MEETINGS}?redirect=${stateObject.redirect}`
          : `/dashboard/${EditMode.MEETINGS}`
      )
      closeOnboarding()
    } catch (e) {
      console.error(e)
      setLoadingSave(false)
    }
  }

  const activeStepColor = useColorModeValue('neutral.400', 'neutral.50')
  const stepColor = useColorModeValue('neutral.50', 'neutral.400')

  const handleClose = () => {
    const pollContext = getQuickPollSignInContext()
    if (pollContext) {
      setPollContextForConfirmation({
        pollId: pollContext.pollId,
        pollSlug: pollContext.pollSlug,
        pollTitle: pollContext.pollTitle,
      })
      setShowJoinPollConfirmation(true)
      closeOnboarding()
    } else {
      closeOnboarding(stateObject.redirect)
    }
  }

  const { showErrorToast, showSuccessToast } = useToastHelpers()

  const handleJoinPollConfirmSave = async (
    pollName: string,
    pollEmail: string
  ) => {
    if (!currentAccount || !pollContextForConfirmation) return
    try {
      await joinQuickPollAsParticipant(
        pollContextForConfirmation.pollId,
        pollEmail,
        pollName
      )
      clearQuickPollSignInContext()
      setShowJoinPollConfirmation(false)
      setPollContextForConfirmation(null)
      showSuccessToast(
        "You've been added to the poll",
        'Redirecting you to add your availability.'
      )
      await router.push(
        `/dashboard/schedule?ref=quickpoll&pollId=${pollContextForConfirmation.pollId}&intent=edit_availability`
      )
      closeOnboarding()
    } catch (error) {
      showErrorToast(
        'Failed to join poll',
        'There was an error adding you to the poll. Please try again.'
      )
    }
  }

  return (
    <>
      <Modal
        isOpen={isOnboardingOpened}
        onClose={handleClose}
        closeOnOverlayClick={false}
        closeOnEsc={false}
        size="xl"
        isCentered
      >
        <ModalOverlay
          bg="blackAlpha.600"
          backdropFilter="blur(10px)"
          zIndex={1600}
        />
        <ModalContent
          padding={{ base: 4, sm: 10, md: 20 }}
          maxW="45rem"
          containerProps={{ zIndex: 1600 }}
        >
          <Flex justifyContent="flex-end" mb={4}>
            <Button
              variant="ghost"
              onClick={handleClose}
              isDisabled={loadingSave}
            >
              Skip all
            </Button>
          </Flex>

          <Flex direction="column" gap={4} mb={4}>
            <Box>Step {activeStep + 1} of 3</Box>
            <Flex gap="5px">
              {[1, 2, 3].map((step, index) => (
                <Flex
                  key={step}
                  flexGrow="1"
                  background={activeStep >= index ? activeStepColor : stepColor}
                  height="3px"
                  borderRadius="40px"
                />
              ))}
            </Flex>
          </Flex>

          <Box>
            {activeStep === 0 && (
              <Flex marginTop={6} direction="column">
                <Heading>Let&apos;s finish setting up!</Heading>
                <Text marginTop={4}>
                  You can provide some basic info to get your profile setup and
                  have a better scheduling experience (for you and others).
                  You&apos;ll be able to edit this later.
                </Text>

                <Flex direction="column" gap={4}>
                  <FormControl marginTop={6}>
                    <FormLabel>Your name</FormLabel>
                    <Input
                      value={name}
                      placeholder="Your name or an identifier"
                      onChange={e => setName(e.target.value)}
                      autoFocus={true}
                    />
                  </FormControl>

                  <FormControl isInvalid={!!email && !isValidEmail(email)}>
                    <FormLabel>Email (optional)</FormLabel>
                    <Input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      placeholder="your@email.com"
                    />
                  </FormControl>

                  <FormControl isRequired isInvalid={!timezone}>
                    <FormLabel>Timezone</FormLabel>
                    <TimezoneSelector
                      value={timezone}
                      onChange={tz => setTimezone(tz)}
                    />
                  </FormControl>

                  <Button
                    colorScheme="primary"
                    marginTop={6}
                    onClick={validateFirstStep}
                  >
                    Next
                  </Button>
                </Flex>
              </Flex>
            )}

            {activeStep === 1 && (
              <Flex marginTop={6} direction="column" gap={10}>
                <Flex direction="column" gap={4}>
                  <Heading>Connect your calendar</Heading>
                  <Text>
                    You can leverage your existing calendars to block your
                    availabilities and also add your new events to it (if you
                    want of course).
                  </Text>
                </Flex>

                <Flex direction="column" gap={4}>
                  {!!getGoogleCalendar() ? (
                    <Flex
                      direction="column"
                      bgColor={bgColor}
                      borderRadius={12}
                      padding={10}
                      gap={6}
                    >
                      <Flex gap={4} alignItems="center">
                        <Circle size={14} bg={avatarBg}>
                          <FaGoogle size={28} color="white" />
                        </Circle>
                        <Flex direction="column" gap={2} lineHeight={1}>
                          <Text fontSize={24} fontWeight="500">
                            Google
                          </Text>
                          <Text textColor={textColor} fontSize={18}>
                            {getGoogleCalendar()?.email}
                          </Text>
                        </Flex>
                      </Flex>
                      <Divider />
                      {getGoogleCalendar()?.calendars?.map(
                        (calendar, index) => {
                          return (
                            <Flex
                              key={calendar.calendarId}
                              gap={3}
                              alignItems="center"
                            >
                              <Switch
                                colorScheme="primary"
                                isChecked={calendar.enabled}
                                onChange={() =>
                                  toggleCalendar(getGoogleCalendar(), index)
                                }
                              />
                              <Text>{calendar.name}</Text>
                            </Flex>
                          )
                        }
                      )}
                    </Flex>
                  ) : (
                    <Button
                      variant="outline"
                      display="flex"
                      gap={2}
                      alignItems="center"
                      onClick={onConnectGoogleCalendar}
                      isDisabled={hasCalendar()}
                      isLoading={isFetchingCalendarConnections}
                    >
                      <FaGoogle />
                      Google
                    </Button>
                  )}

                  {!!getOfficeCalendar() ? (
                    <Flex
                      direction="column"
                      bgColor={bgColor}
                      borderRadius={12}
                      padding={10}
                      gap={6}
                    >
                      <Flex gap={4} alignItems="center">
                        <Circle size={14} bg={avatarBg}>
                          <FaMicrosoft size={28} color="white" />
                        </Circle>
                        <Flex direction="column" gap={2} lineHeight={1}>
                          <Text fontSize={24} fontWeight="500">
                            Office 365
                          </Text>
                          <Text textColor={textColor} fontSize={18}>
                            {getOfficeCalendar()?.email}
                          </Text>
                        </Flex>
                      </Flex>
                      <Divider />
                      {getOfficeCalendar()?.calendars?.map(
                        (calendar, index) => {
                          return (
                            <Flex
                              key={calendar.calendarId}
                              gap={3}
                              alignItems="center"
                            >
                              <Switch
                                colorScheme="primary"
                                isChecked={calendar.enabled}
                                onChange={() =>
                                  toggleCalendar(getOfficeCalendar(), index)
                                }
                              />
                              <Text>{calendar.name}</Text>
                            </Flex>
                          )
                        }
                      )}
                    </Flex>
                  ) : (
                    <Button
                      variant="outline"
                      display="flex"
                      gap={2}
                      alignItems="center"
                      onClick={onConnectOfficeCalendar}
                      isDisabled={hasCalendar()}
                      isLoading={isFetchingCalendarConnections}
                    >
                      <FaMicrosoft />
                      Office 365
                    </Button>
                  )}

                  {!!getAppleCalendar() ? (
                    <Flex
                      direction="column"
                      bgColor={bgColor}
                      borderRadius={12}
                      padding={10}
                      gap={6}
                    >
                      <Flex gap={4} alignItems="center">
                        <Circle size={14} bg={avatarBg}>
                          <FaApple size={28} color="white" />
                        </Circle>
                        <Flex direction="column" gap={2} lineHeight={1}>
                          <Text fontSize={24} fontWeight="500">
                            iCloud
                          </Text>
                          <Text textColor={textColor} fontSize={18}>
                            {getAppleCalendar()?.email}
                          </Text>
                        </Flex>
                      </Flex>
                      <Divider />
                      {getAppleCalendar()?.calendars?.map((calendar, index) => {
                        return (
                          <Flex
                            key={calendar.calendarId}
                            gap={3}
                            alignItems="center"
                          >
                            <Switch
                              colorScheme="primary"
                              isChecked={calendar.enabled}
                              onChange={() =>
                                toggleCalendar(getOfficeCalendar(), index)
                              }
                            />
                            <Text>{calendar.name}</Text>
                          </Flex>
                        )
                      })}
                    </Flex>
                  ) : !isAppleCalDavOpen ? (
                    <Button
                      variant="outline"
                      display="flex"
                      gap={2}
                      alignItems="center"
                      onClick={() => setIsAppleCalDavOpen(!isAppleCalDavOpen)}
                      isDisabled={hasCalendar()}
                      isLoading={isFetchingCalendarConnections}
                    >
                      <FaApple />
                      iCloud
                    </Button>
                  ) : (
                    <Flex
                      borderWidth="1px"
                      borderRadius={6}
                      paddingX={4}
                      paddingY={2}
                      flexDirection="column"
                    >
                      <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        width="100%"
                        gap={2}
                      >
                        <Flex width={10} />

                        <Flex alignItems="baseline" gap={2}>
                          <FaApple />
                          iCloud
                        </Flex>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setIsAppleCalDavOpen(!isAppleCalDavOpen)
                          }
                        >
                          X
                        </Button>
                      </Flex>
                      <WebDavDetailsPanel
                        isApple={true}
                        onSuccess={async () => {
                          await refetchCalendarConnections()
                          setIsAppleCalDavOpen(false)
                        }}
                      />
                    </Flex>
                  )}

                  {!!getDavCalendar() ? (
                    <Flex
                      direction="column"
                      bgColor={bgColor}
                      borderRadius={12}
                      padding={10}
                      gap={6}
                    >
                      <Flex gap={4} alignItems="center">
                        <Circle size={14} bg={avatarBg}>
                          <FaMicrosoft size={28} color="white" />
                        </Circle>
                        <Flex direction="column" gap={2} lineHeight={1}>
                          <Text fontSize={24} fontWeight="500">
                            Webdav
                          </Text>
                          <Text textColor={textColor} fontSize={18}>
                            {getDavCalendar()?.email}
                          </Text>
                        </Flex>
                      </Flex>
                      <Divider />
                      {getDavCalendar()?.calendars?.map((calendar, index) => {
                        return (
                          <Flex
                            key={calendar.calendarId}
                            gap={3}
                            alignItems="center"
                          >
                            <Switch
                              colorScheme="primary"
                              isChecked={calendar.enabled}
                              onChange={() =>
                                toggleCalendar(getDavCalendar(), index)
                              }
                            />
                            <Text>{calendar.name}</Text>
                          </Flex>
                        )
                      })}
                    </Flex>
                  ) : !isCalDavOpen ? (
                    <Button
                      variant="outline"
                      display="flex"
                      gap={2}
                      alignItems="center"
                      onClick={() => setIsCalDavOpen(!isCalDavOpen)}
                      isDisabled={hasCalendar()}
                      isLoading={isFetchingCalendarConnections}
                    >
                      <FaMicrosoft />
                      Webdav
                    </Button>
                  ) : (
                    <Flex
                      borderWidth="1px"
                      borderRadius={6}
                      paddingX={4}
                      paddingY={2}
                      flexDirection="column"
                    >
                      <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        width="100%"
                        gap={2}
                      >
                        <Flex width={10} />

                        <Flex alignItems="baseline" gap={2}>
                          <FaMicrosoft />
                          Webdav
                        </Flex>
                        <Button
                          variant="ghost"
                          onClick={() => setIsCalDavOpen(!isCalDavOpen)}
                        >
                          X
                        </Button>
                      </Flex>
                      <WebDavDetailsPanel
                        isApple={false}
                        onSuccess={async () => {
                          await refetchCalendarConnections()
                          setIsCalDavOpen(false)
                        }}
                      />
                    </Flex>
                  )}

                  {hasCalendar() ? (
                    <Text textAlign="center">
                      You can connect more calendars later on.
                    </Text>
                  ) : null}
                </Flex>

                <Flex gap={5}>
                  <Button
                    variant="outline"
                    colorScheme="primary"
                    onClick={goToPreviousStep}
                    flex={1}
                  >
                    Back
                  </Button>
                  <Button flex={1} colorScheme="primary" onClick={goToNextStep}>
                    Next
                  </Button>
                </Flex>
              </Flex>
            )}

            {activeStep === 2 && (
              <Flex marginTop={6} direction="column" gap={10}>
                <Flex direction="column" gap={4}>
                  <Heading>Set your availabilities</Heading>
                  <Text>
                    Define ranges of time when you are available. You can also
                    customize all of this later.
                  </Text>
                </Flex>

                <OnboardingAvailabilityStep
                  formState={availabilityFormState}
                  onTitleChange={handleAvailabilityTitleChange}
                  onTimezoneChange={handleAvailabilityTimezoneChange}
                  onAvailabilityChange={handleAvailabilityChange}
                  onMeetingTypesChange={handleMeetingTypesChange}
                  isLoading={loadingSave}
                  currentAccount={currentAccount}
                />

                <Flex gap={5}>
                  <Button
                    variant="outline"
                    colorScheme="primary"
                    onClick={goToPreviousStep}
                    flex={1}
                    isDisabled={loadingSave}
                  >
                    Back
                  </Button>
                  <Button
                    flex={1}
                    colorScheme="primary"
                    onClick={onSave}
                    isLoading={loadingSave}
                  >
                    Get Started
                  </Button>
                </Flex>
              </Flex>
            )}
          </Box>
        </ModalContent>
      </Modal>
      {pollContextForConfirmation && showJoinPollConfirmation && (
        <JoinPollConfirmModal
          isOpen={true}
          onClose={() => {
            setShowJoinPollConfirmation(false)
            setPollContextForConfirmation(null)
          }}
          pollId={pollContextForConfirmation.pollId}
          pollSlug={pollContextForConfirmation.pollSlug}
          pollTitle={pollContextForConfirmation.pollTitle}
          initialFullName={name}
          initialEmail={email}
          onSave={handleJoinPollConfirmSave}
        />
      )}
    </>
  )
}

export default OnboardingModal
