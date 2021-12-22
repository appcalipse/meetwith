import React, { useState } from 'react'
import PropTypes from 'prop-types'
import dateFns from 'date-fns'

import { PopupWrapper, Popup, PopupHeader } from './Popup'
import { SuccessIcon, FailedIcon } from './Icons'
import { Success, Failed } from './Feedback'

import Calendar from './calendar'
import TimeSlots from './time-slots'

import { preventPastDays } from './validators'
import { Button } from '@chakra-ui/button'
import { Box } from '@chakra-ui/layout'
import { Textarea } from '@chakra-ui/textarea'
import {
  Icon,
  HStack,
  Text,
  useColorModeValue,
  Input,
  Switch,
  FormLabel,
  Link,
} from '@chakra-ui/react'
import { FaArrowLeft, FaCalendar, FaClock } from 'react-icons/fa'
import { logEvent } from '../../utils/analytics'

function DayTimePicker({
  timeSlotValidator,
  timeSlotSizeMinutes,
  isLoading,
  isDone,
  err,
  onConfirm,
  confirmText,
  loadingText,
  doneText,
  dayChanged,
  monthChanged,
  willStartScheduling,
  isSchedulingExternal,
  reset,
}) {
  const [pickedDay, setPickedDay] = useState(null)
  const [pickedTime, setPickedTime] = useState(null)
  const [showPickTime, setShowPickTime] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [customMeeting, setCustomMeeting] = useState(false)
  const [meetingUrl, setMeetingUrl] = useState('')

  React.useEffect(() => {
    if (reset) {
      setPickedDay(null)
      setPickedTime(null)
      setContent('')
      setShowPickTime(false)
      setShowConfirm(false)
      setIsScheduling(false)
    }
  }, [reset])

  const handlePickDay = day => {
    if (pickedDay !== day) {
      dayChanged && dayChanged(day)
    }
    logEvent('Selected day')
    setPickedDay(day)
    setShowPickTime(true)
  }

  const handlePickTime = time => {
    logEvent('Selected time')
    setPickedTime(time)
    setShowPickTime(false)
    setShowConfirm(true)
    willStartScheduling(true)
  }

  const handleClosePickTime = () => {
    setShowPickTime(false)
  }

  const handleConfirm = async () => {
    setIsScheduling(true)
    const success = await onConfirm(pickedTime, name, content, meetingUrl)
    setIsScheduling(false)
    willStartScheduling(!success)
  }

  const handleCloseConfirm = () => {
    willStartScheduling(false)
    setShowConfirm(false)
    setShowPickTime(true)
  }

  const color = useColorModeValue('orange.500', 'orange.400')

  return (
    <PopupWrapper>
      {!showPickTime && !showConfirm && (
        <Calendar
          validator={preventPastDays}
          monthChanged={monthChanged}
          pickDay={handlePickDay}
        />
      )}

      {showPickTime && (
        <Popup>
          <PopupHeader>
            <HStack mb={4} cursor="pointer" onClick={handleClosePickTime}>
              <Icon as={FaArrowLeft} size="1.5em" color={color} />
              <Text ml={3} color={color}>
                Back
              </Text>
            </HStack>
            <HStack>
              <FaCalendar />
              <Text>{dateFns.format(pickedDay, 'dddd, MMMM Do, YYYY')}</Text>
            </HStack>
          </PopupHeader>

          <TimeSlots
            pickedDay={pickedDay}
            slotSizeMinutes={timeSlotSizeMinutes}
            validator={timeSlotValidator}
            pickTime={handlePickTime}
          />
        </Popup>
      )}

      {showConfirm && (
        <Popup>
          <PopupHeader>
            {!isDone && (
              <HStack mb={4} cursor="pointer" onClick={handleCloseConfirm}>
                <Icon as={FaArrowLeft} size="1.5em" color={color} />
                <Text ml={3} color={color}>
                  Back
                </Text>
              </HStack>
            )}
            <HStack>
              <FaCalendar />
              <Text>{dateFns.format(pickedDay, 'dddd, MMMM Do, YYYY')}</Text>
            </HStack>

            <HStack>
              <FaClock />
              <Text>{dateFns.format(pickedTime, 'HH:mm')}</Text>
            </HStack>
          </PopupHeader>

          {!isDone ? (
            <Box>
              <FormLabel>Your name (optional)</FormLabel>
              <Input
                disabled={isScheduling}
                type="text"
                placeholder="Your name or an identifier (if you want to provide)"
                value={name}
                onChange={e => setName(e.target.value)}
                mb={4}
              />

              <FormLabel>Information (optional)</FormLabel>
              <Textarea
                disabled={isScheduling}
                type="text"
                placeholder="Any information you want to share prior to the meeting?"
                value={content}
                onChange={e => setContent(e.target.value)}
              />

              <HStack my={4}>
                <Switch
                  colorScheme="orange"
                  size="lg"
                  mr={4}
                  defaultChecked={!customMeeting}
                  onChange={e => setCustomMeeting(!e.target.checked)}
                />
                <FormLabel htmlFor="email-alerts" mb="0">
                  <Text color="gray">
                    Use{' '}
                    <Link isExternal href="https://huddle01.com">
                      Huddle
                    </Link>{' '}
                    for your meeting (a link will be generated for you). Huddle
                    is a decentralized meeting platform taillored for #web3.
                  </Text>
                </FormLabel>
              </HStack>

              {customMeeting && (
                <Input
                  mb={4}
                  type="text"
                  placeholder="insert a custom meeting url"
                  value={meetingUrl}
                  onChange={e => setMeetingUrl(e.target.value)}
                />
              )}

              <Button
                isFullWidth
                disabled={isLoading}
                isLoading={isScheduling || isSchedulingExternal}
                onClick={handleConfirm}
                colorScheme="orange"
                mt={2}
              >
                {isLoading ? loadingText : confirmText}
              </Button>
            </Box>
          ) : doneText ? (
            <Success>
              <p>
                <SuccessIcon /> {doneText}
              </p>
            </Success>
          ) : null}

          {err && (
            <Failed>
              <p>
                <FailedIcon /> {err}
              </p>
            </Failed>
          )}
        </Popup>
      )}
    </PopupWrapper>
  )
}

DayTimePicker.propTypes = {
  timeSlotValidator: PropTypes.func,
  timeSlotSizeMinutes: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  isDone: PropTypes.bool,
  err: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  willStartScheduling: PropTypes.func,
  isSchedulingExternal: PropTypes.bool,
  reset: PropTypes.bool,
  confirmText: PropTypes.string,
  loadingText: PropTypes.string,
  doneText: PropTypes.string,
  theme: PropTypes.shape({
    primary: PropTypes.string,
    secondary: PropTypes.string,
    background: PropTypes.string,
    buttons: PropTypes.shape({
      disabled: PropTypes.shape({
        color: PropTypes.string,
        background: PropTypes.string,
      }),
      confirm: PropTypes.shape({
        color: PropTypes.string,
        background: PropTypes.string,
        hover: PropTypes.shape({
          color: PropTypes.string,
          background: PropTypes.string,
        }),
      }),
    }),
  }),
}

DayTimePicker.defaultProps = {
  confirmText: 'Schedule',
  loadingText: 'Scheduling..',
  doneText: 'Your event has been scheduled!',
  theme: {
    primary: '#f35826',
    secondary: '#f0f0f0',
    background: '#fff',
    buttons: {
      disabled: {
        color: '#333',
        background: '#dfdfdf',
      },
      confirm: {
        color: '#fff',
        background: '#3a9ad9',
        hover: {
          color: '',
          background: '#3a9ad9d6',
        },
      },
    },
    feedback: {
      success: {
        color: '#29aba4',
      },
      failed: {
        color: '#eb7260',
      },
    },
  },
}

export default DayTimePicker
