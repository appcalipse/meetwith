import {
  Button,
  Circle,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Input,
  Modal,
  ModalContent,
  ModalOverlay,
  Switch,
  Text,
  useColorModeValue,
  useSteps,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import React, { FC, useContext, useEffect, useState } from 'react'
import { FaApple, FaGoogle, FaMicrosoft } from 'react-icons/fa'

import { WeekdayConfig } from '@/components/availabilities/weekday-config'
import WebDavDetailsPanel from '@/components/ConnectedCalendars/WebDavCalendarDetail'
import InfoTooltip from '@/components/profile/components/Tooltip'
import TimezoneSelector from '@/components/TimezoneSelector'
import { AccountContext } from '@/providers/AccountProvider'
import { TimeRange } from '@/types/Account'
import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { logEvent } from '@/utils/analytics'
import {
  getGoogleAuthConnectUrl,
  getOffice365ConnectUrl,
  listConnectedCalendars,
  saveAccountChanges,
  updateConnectedCalendar,
} from '@/utils/api_helper'
import { generateDefaultAvailabilities } from '@/utils/calendar_manager'
import { queryClient } from '@/utils/react_query'

interface IGroupOnBoardingModalProps {
  isOnboardingOpened: boolean
  handleClose: () => void
  groupName: string
}

const GroupOnBoardingModal: FC<IGroupOnBoardingModalProps> = ({
  isOnboardingOpened,
  handleClose,
  groupName,
}) => {
  const [calendarConnections, setCalendarConnections] = useState<
    ConnectedCalendarCore[]
  >([])
  const bgColor = useColorModeValue('gray.100', 'gray.600')
  const avatarBg = useColorModeValue('gray.700', 'gray.500')
  const textColor = useColorModeValue('neutral.600', 'neutral.200')
  const { asPath } = useRouter()
  const queryParams = useSearchParams()
  const { currentAccount, login } = useContext(AccountContext)
  const [isAppleCalDavOpen, setIsAppleCalDavOpen] = useState(false)
  const [isCalDavOpen, setIsCalDavOpen] = useState(false)
  const state = queryParams.get('calState')
  const [loadingSave, setLoadingSave] = useState(false)
  const stateObject =
    typeof state === 'string'
      ? JSON.parse(Buffer.from(state as string, 'base64').toString())
      : {}
  const [name, setName] = useState<string>(stateObject.name || '')
  const [timezone, setTimezone] = useState<string | undefined | null>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  const {
    activeStep,
    goToNext: goToNextStep,
    goToPrevious: goToPreviousStep,
    setActiveStep,
  } = useSteps({
    index: 0,
    count: 3,
  })
  const [availabilities, setInitialAvailabilities] = useState(
    generateDefaultAvailabilities()
  )
  const {
    data: calendarConnectionsData,
    isFetching: isFetchingCalendarConnections,
  } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => listConnectedCalendars(),
  })
  useEffect(() => {
    setCalendarConnections(calendarConnectionsData ?? [])
  }, [calendarConnectionsData])

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
    if (currentAccount?.preferences?.name) {
      setName(currentAccount.preferences.name)
      setActiveStep(1)
    }
  }, [currentAccount])
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

  async function onConnectGoogleCalendar() {
    stateObject.name = name
    stateObject.redirectTo = asPath
    const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
      'base64'
    )

    const response = await getGoogleAuthConnectUrl(newState64)
    response && window.location.assign(response.url)
  }

  async function onConnectOfficeCalendar() {
    stateObject.name = name
    stateObject.redirectTo = asPath

    const newState64 = Buffer.from(JSON.stringify(stateObject)).toString(
      'base64'
    )

    const response = await getOffice365ConnectUrl(newState64)
    response && window.location.assign(response.url)
  }

  const calendarIsConnected = calendarConnections.length > 0
  const onChange = (day: number, ranges: TimeRange[] | null) => {
    const newAvailabilities = [...availabilities]
    newAvailabilities[day] = { weekday: day, ranges: ranges ?? [] }
    setInitialAvailabilities(newAvailabilities)
  }

  const handleSave = async () => {
    console.log('saving....')
    if (!currentAccount?.preferences || !timezone) return
    setLoadingSave(true)
    const updatedAccount = await saveAccountChanges({
      ...currentAccount,
      preferences: {
        ...currentAccount.preferences,
        name: name,
        timezone,
        availabilities,
      },
    })
    logEvent('Updated account details')
    login(updatedAccount)
    setLoadingSave(false)
    if (activeStep === 2) handleClose()
  }
  return (
    <Modal
      isOpen={isOnboardingOpened}
      onClose={handleClose}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size="xl"
      isCentered
    >
      <ModalOverlay />
      <ModalContent padding={6} maxW="500px">
        <VStack>
          {activeStep === 1 && (
            <Button
              onClick={handleSave}
              textAlign="right"
              fontWeight="500"
              variant="link"
              marginLeft="auto"
              alignSelf="flex-end"
            >
              Skip for now
            </Button>
          )}
          <Image
            width="70px"
            src="/assets/logo.svg"
            alt="Meetwith"
            marginX="auto"
          />
        </VStack>
        {activeStep === 0 && (
          <Flex marginTop={6} direction="column">
            <Heading fontSize="24px">Enter display name</Heading>
            <Text marginTop={4} color={textColor}>
              Enter your name below before joining {groupName}. You’ll be able
              to edit this later.
            </Text>

            <Flex direction="column" gap={4}>
              <FormControl marginTop={6}>
                <FormLabel fontWeight="500" display="flex" alignItems="center">
                  <span>Display name </span>
                  <InfoTooltip text="Add a link to the selected text" />
                </FormLabel>
                <Input
                  value={name}
                  placeholder="Your name or an identifier"
                  onChange={e => setName(e.target.value)}
                  autoFocus={true}
                />
              </FormControl>
            </Flex>
          </Flex>
        )}
        {activeStep === 1 && (
          <Flex marginTop={6} direction="column" gap={10}>
            <Flex direction="column" gap={4}>
              <Heading fontSize="24px">Connect your calendar</Heading>
              <Text color={textColor}>
                Connecting existing calendars improve accuracy when you and{' '}
                {groupName} members schedule meetings.
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
                  {getGoogleCalendar()?.calendars?.map((calendar, index) => {
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
                  })}
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
                  {getOfficeCalendar()?.calendars?.map((calendar, index) => {
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
                      onClick={() => setIsAppleCalDavOpen(!isAppleCalDavOpen)}
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
          </Flex>
        )}
        {activeStep === 2 && (
          <Flex marginTop={6} direction="column" gap={2}>
            <Flex direction="column" gap={4}>
              <Heading>Set your availabilities</Heading>
              <Text>
                Define ranges of time when you are available. You can also
                customize all of this later.
              </Text>
            </Flex>
            <FormControl isInvalid={!timezone}>
              <FormLabel>Timezone</FormLabel>
              <TimezoneSelector
                value={timezone}
                onChange={tz => setTimezone(tz)}
              />
            </FormControl>
            <Flex direction="column" justifyContent="center">
              {availabilities.map((availability, index) => (
                <WeekdayConfig
                  key={`${currentAccount?.address}:${index}`}
                  dayAvailability={availability}
                  onChange={onChange}
                />
              ))}
            </Flex>
          </Flex>
        )}
        <Flex gap={5} mt={10}>
          {((activeStep > 0 && !currentAccount?.preferences.name) ||
            activeStep === 2) && (
            <Button
              variant="outline"
              colorScheme="primary"
              onClick={goToPreviousStep}
              flex={1}
              isLoading={isFetchingCalendarConnections || loadingSave}
            >
              Back
            </Button>
          )}
          <Button
            flex={1}
            colorScheme="primary"
            onClick={activeStep !== 1 ? handleSave : goToNextStep}
            isLoading={isFetchingCalendarConnections || loadingSave}
          >
            {activeStep === 2 ? 'Confirm' : 'Next'}
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  )
}

export default GroupOnBoardingModal
