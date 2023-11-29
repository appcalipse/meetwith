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
  Select,
  Spinner,
  Switch,
  Text,
  useColorModeValue,
  useDisclosure,
  useSteps,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useModal } from 'connectkit'
import { useSearchParams } from 'next/navigation'
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { FaApple, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { DiscordUserInfo } from '@/types/DiscordUserInfo'
import { TimeSlotSource } from '@/types/Meeting'
import {
  getGoogleAuthConnectUrl,
  getOffice365ConnectUrl,
  internalFetch,
  listConnectedCalendars,
  updateConnectedCalendar,
} from '@/utils/api_helper'
import { OnboardingSubject } from '@/utils/constants'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

import { AccountContext } from '../../providers/AccountProvider'
import WebDavDetailsPanel from '../ConnectedCalendars/WebDavCalendarDetail'
import TimezoneSelector from '../TimezoneSelector'

let didInit = false
let didOpenConnectWallet = false

const OnboardingModal = forwardRef((props, ref) => {
  // Callback Control
  const queryParams = useSearchParams()
  const state = queryParams.get('state')
  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state as string, 'base64').toString())
      : undefined
  const origin = stateObject?.origin as OnboardingSubject | undefined

  // Color Control
  const bgColor = useColorModeValue('white', 'gray.600')
  const avatarBg = useColorModeValue('gray.700', 'gray.500')

  // Onboarding Modal Control
  const { isOpen, onOpen, onClose } = useDisclosure()
  // Wallet Modal Control
  const { setOpen: setWalletModalOpen } = useModal()
  const {
    activeStep,
    goToNext: goToNextStep,
    goToPrevious: goToPreviousStep,
    setActiveStep,
  } = useSteps({
    index: 0,
    count: 2,
  })
  // Necessary to call these functions from parent
  useImperativeHandle(ref, () => ({
    onOpen,
    onClose,
    isOpen,
  }))

  // User Control
  const { currentAccount } = useContext(AccountContext)

  // Modal opening flow
  useEffect(() => {
    // When something related to user changes, check if we should open the modal

    console.log({ stateObject })
    console.log({
      currentAccount,
      didInit,
      didOpenConnectWallet,
      isOpen,
    })

    // If the user is logged in and modal hans't been opened yet
    if (!!currentAccount?.address && !didInit) {
      // We check if the user is comming from Discord Onboarding Modal
      // and has its discord account linked
      if (
        origin === OnboardingSubject.DiscordConnectedInModal &&
        !!currentAccount.discord_account
      ) {
        onOpen()
        didInit = true
      }

      if (
        (origin === OnboardingSubject.GoogleCalendarConnected ||
          origin === OnboardingSubject.Office365CalendarConnected) &&
        !!currentAccount.discord_account
      ) {
        setActiveStep(1)
        onOpen()
        didInit = true
      }
      // If not, we check if any origin is passed in and if the user its not logged in
      // and connection modal is not open this way we will trigger the wallet connection
      // modal
    } else if (
      !currentAccount?.address &&
      !!origin &&
      !didOpenConnectWallet &&
      !isOpen
    ) {
      // We open the connection modal and avoid it being opened again
      setWalletModalOpen(true)
      didOpenConnectWallet = true
    }
  }, [currentAccount, onOpen, origin, setWalletModalOpen, isOpen])

  // Discord Step
  async function fillDiscordUserInfo() {
    const discordUserInfo = await queryClient.fetchQuery(
      QueryKeys.discordUserInfo(currentAccount?.address),
      () =>
        internalFetch('/secure/discord/info') as Promise<
          DiscordUserInfo | undefined
        >
    )

    if (discordUserInfo?.global_name) setName(discordUserInfo.global_name)
  }

  useEffect(() => {
    if (isOpen === true) fillDiscordUserInfo()
  }, [isOpen])

  const [name, setName] = useState<string | undefined>(
    stateObject?.name || undefined
  )
  const [email, setEmail] = useState<string | undefined>(
    stateObject?.email || undefined
  )
  const [timezone, setTimezone] = useState<string | undefined | null>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  function validateFirstStep() {
    if (!name || !timezone) return
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

  // TODO: Needs to handle Pro Account Block

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={false}
        closeOnEsc={false}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent padding={20} maxW="45rem">
          <Flex direction="column">
            <Flex justifyContent="flex-end">
              <Button variant="ghost" onClick={onClose}>
                Skip
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
                      activeStep >= index ? 'neutral.50' : 'neutral.400'
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
                        placeholder="your name or an identifier"
                        onChange={e => setName(e.target.value)}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Email (optional)</FormLabel>
                      <Input
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        type="email"
                        placeholder="your@email.com"
                      />
                    </FormControl>

                    <FormControl>
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

                  {isFetchingCalendarConnections && (
                    <Flex
                      width="100%"
                      justifyContent="center"
                      alignItems="center"
                      gap={2}
                    >
                      {/* TODO: Temporary needs better design */}
                      <Spinner />
                      <Text>Updating ...</Text>
                    </Flex>
                  )}

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
                            <FaGoogle size={28} />
                          </Circle>
                          <Flex direction="column" gap={2} lineHeight={1}>
                            <Text fontSize={24} fontWeight="600">
                              Google
                            </Text>
                            <Text textColor="neutral.200" fontSize={24}>
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
                            <FaMicrosoft size={28} />
                          </Circle>
                          <Flex direction="column" gap={2} lineHeight={1}>
                            <Text fontSize={24} fontWeight="600">
                              Office 365
                            </Text>
                            <Text textColor="neutral.200" fontSize={24}>
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
                            <FaApple size={28} />
                          </Circle>
                          <Flex direction="column" gap={2} lineHeight={1}>
                            <Text fontSize={24} fontWeight="600">
                              iCloud
                            </Text>
                            <Text textColor="neutral.200" fontSize={24}>
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
                            <FaMicrosoft size={28} />
                          </Circle>
                          <Flex direction="column" gap={2} lineHeight={1}>
                            <Text fontSize={24} fontWeight="600">
                              Webdav
                            </Text>
                            <Text textColor="neutral.200" fontSize={24}>
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

                  <Flex direction="column" gap={4} justifyContent="center">
                    {[1, 2, 3, 4, 5, 6, 7].map(weekDay => (
                      <Flex gap={3} key={weekDay}>
                        <Text>X</Text>
                        <Text flex={1}>weekDay</Text>
                        <Select />
                        -
                        <Select />
                        <Button>D</Button>
                        <Button>+</Button>
                      </Flex>
                    ))}
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
                    <Button flex={1} colorScheme="primary">
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
})

OnboardingModal.displayName = 'OnboardingModal'
export default OnboardingModal
