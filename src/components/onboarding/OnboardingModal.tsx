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

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { TimeRange } from '@/types/Account'
import { NotificationChannel } from '@/types/AccountNotifications'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { EditMode } from '@/types/Dashboard'
import { DiscordUserInfo } from '@/types/DiscordUserInfo'
import { TimeSlotSource } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import {
  getGoogleAuthConnectUrl,
  getOffice365ConnectUrl,
  internalFetch,
  listConnectedCalendars,
  saveAccountChanges,
  setNotificationSubscriptions,
  updateConnectedCalendar,
} from '@/utils/api_helper'
import { generateDefaultAvailabilities } from '@/utils/calendar_manager'
import { OnboardingSubject } from '@/utils/constants'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { isValidEmail } from '@/utils/validations'

import { WeekdayConfig } from '../availabilities/weekday-config'
import WebDavDetailsPanel from '../ConnectedCalendars/WebDavCalendarDetail'
import TimezoneSelector from '../TimezoneSelector'

const OnboardingModal = () => {
  const router = useRouter()

  // Callback Control
  const queryParams = useSearchParams()
  const state = queryParams.get('state')
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

  const [availabilities, setInitialAvailabilities] = useState(
    generateDefaultAvailabilities()
  )

  // Modal opening flow
  useEffect(() => {
    // When something related to user changes, check if we should open the modal
    // If the user is logged in and modal hans't been opened yet
    if (!!currentAccount?.address && !onboardingInit && !skipNextSteps) {
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

      // If not, we check if any origin is passed in and if the user its not logged in
      // and connection modal is not open this way we will trigger the wallet connection
      // modal
    } else if (
      !currentAccount?.address &&
      !!origin &&
      !didOpenConnectWallet &&
      !isOnboardingOpened
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

  const onChange = (day: number, ranges: TimeRange[] | null) => {
    const newAvailabilities = [...availabilities]
    newAvailabilities[day] = { weekday: day, ranges: ranges ?? [] }
    setInitialAvailabilities(newAvailabilities)
  }

  const [loadingSave, setLoadingSave] = useState(false)

  async function onSave() {
    if (!currentAccount?.preferences || !timezone) return

    setLoadingSave(true)

    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount,
        preferences: {
          ...currentAccount.preferences,
          name: name,
          timezone,
          availabilities,
        },
      })
      if (!!email)
        await setNotificationSubscriptions({
          account_address: currentAccount.address,
          notification_types: [
            {
              channel: NotificationChannel.EMAIL,
              destination: email,
              disabled: false,
            },
          ],
        })
      logEvent('Updated account details')
      login(updatedAccount)

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
  const handleClose = () => closeOnboarding(stateObject.redirect)
  return (
    <>
      <Modal
        isOpen={isOnboardingOpened}
        onClose={handleClose}
        closeOnOverlayClick={false}
        closeOnEsc={false}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent padding={{ base: 4, sm: 10, md: 20 }} maxW="45rem">
          <Flex direction="column">
            <Flex justifyContent="flex-end">
              <Button
                variant="ghost"
                onClick={handleClose}
                isDisabled={loadingSave}
              >
                Skip all
              </Button>
            </Flex>
            <Flex direction="column" gap={4}>
              <Box>Step {activeStep + 1} of 3</Box>
              <Flex gap="5px">
                {[1, 2, 3].map((step, index) => (
                  <Flex
                    key={step}
                    flexGrow="1"
                    background={
                      activeStep >= index ? activeStepColor : stepColor
                    }
                    height="3px"
                    borderRadius="40px"
                  />
                ))}
              </Flex>

              {activeStep === 0 && (
                <Flex marginTop={6} direction="column">
                  <Heading>Let&apos;s finish setting up!</Heading>
                  <Text marginTop={4}>
                    You can provide some basic info to get your profile setup
                    and have a better scheduling experience (for you and
                    others). You&apos;ll be able to edit this later.
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
                        {getAppleCalendar()?.calendars?.map(
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
                        <WebDavDetailsPanel isApple={true} />
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
                        <WebDavDetailsPanel isApple={false} />
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
                    <Button
                      flex={1}
                      colorScheme="primary"
                      onClick={goToNextStep}
                    >
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

                  <Flex direction="column" justifyContent="center">
                    {availabilities.map((availability, index) => (
                      <WeekdayConfig
                        key={`${currentAccount?.address}:${index}`}
                        dayAvailability={availability}
                        onChange={onChange}
                      />
                    ))}
                  </Flex>

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
            </Flex>
          </Flex>
        </ModalContent>
      </Modal>
    </>
  )
}

export default OnboardingModal
