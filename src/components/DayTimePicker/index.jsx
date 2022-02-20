import {
  Box,
  HStack,
  Icon,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { FaArrowLeft, FaCalendar, FaClock } from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import { logEvent } from '../../utils/analytics'
import { ScheduleForm } from '../schedule/schedule-form'
import Calendar from './calendar'
import { Failed, Success } from './Feedback'
import { FailedIcon, SuccessIcon } from './Icons'
import { Popup, PopupHeader, PopupWrapper } from './Popup'
import TimeSlots from './time-slots'
import { preventPastDays } from './validators'

function DayTimePicker({
  timeSlotValidator,
  timeSlotSizeMinutes,
  isDone,
  err,
  onConfirm,
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

  const { currentAccount } = React.useContext(AccountContext)

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
            <HStack alignItems="flex-start">
              <Box mt="4px">
                <FaCalendar />
              </Box>
              <VStack alignItems="flex-start">
                <Text>{format(pickedDay, 'PPPP')}</Text>
                <Text fontSize="sm">
                  Timezone:{' '}
                  {currentAccount?.preferences?.timezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone}
                </Text>
              </VStack>
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
              <Text>{format(pickedDay, 'PPPP')}</Text>
            </HStack>

            <HStack>
              <FaClock />
              <Text>{format(pickedTime, 'HH:mm')}</Text>
            </HStack>
          </PopupHeader>

          {!isDone ? (
            <ScheduleForm
              onConfirm={onConfirm}
              willStartScheduling={willStartScheduling}
              pickedTime={pickedTime}
              isSchedulingExternal={isSchedulingExternal}
            />
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
  isDone: PropTypes.bool,
  err: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  willStartScheduling: PropTypes.func,
  isSchedulingExternal: PropTypes.bool,
  reset: PropTypes.bool,
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
