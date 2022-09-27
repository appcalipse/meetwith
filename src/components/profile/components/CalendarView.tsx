/* eslint-disable */
// import order matters for fullcalendar
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
/* eslint-enable */
import React, { useEffect, useRef, useState } from 'react'
import { DBSlot } from '@/types/Meeting'
import { fetchContentFromIPFSFromBrowser } from '@/utils/api_helper'
import { Encrypted } from 'eth-crypto'
import { decryptMeeting } from '@/utils/calendar_manager'
import { CalendarServiceHelper } from '@/utils/services/calendar.helper'
import { Account } from '@/types/Account'
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
  VStack,
} from '@chakra-ui/react'
import MeetingCard from '@/components/meeting/MeetingCard'
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'
import { format } from 'date-fns'

interface CalendarViewProps {
  meetings: DBSlot[]
  currentAccount: Account
  currentDate: Date
  setCurrentDate: (date: Date) => void
}
const CalendarView: React.FC<CalendarViewProps> = ({
  meetings,
  currentAccount,
  currentDate,
  setCurrentDate,
}) => {
  const calendarRef = useRef<FullCalendar>(null!)

  const mappedMeetings = meetings.map(m => {
    return {
      start: m.start,
      end: m.end,
      id: m.id,
    }
  })
  const [events, setEvents] = useState(mappedMeetings)
  const [currentView, setCurrentView] = useState<any>('timeGridWeek')

  const decodeData = async (meeting: DBSlot) => {
    const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
      meeting.meeting_info_file_path
    )) as Encrypted
    if (meetingInfoEncrypted) {
      const decryptedMeeting = await decryptMeeting(
        {
          ...meeting,
          meeting_info_encrypted: meetingInfoEncrypted,
        },
        currentAccount!
      )

      return {
        title: CalendarServiceHelper.getMeetingTitle(
          currentAccount.address,
          decryptedMeeting.participants
        ),
      }
    }
  }

  const enhanceMeetings = async () => {
    const enhanced = []
    for (const m of meetings) {
      const decoded = await decodeData(m)
      let mapped = events.filter(map => map.id === m.id)[0]
      mapped = { ...mapped, ...decoded }
      enhanced.push(mapped)
    }
    setEvents(enhanced)
  }

  useEffect(() => {
    enhanceMeetings()
  }, [meetings])

  return (
    <VStack mb={8}>
      <Flex w="100%" mb={4}>
        <HStack>
          <Button
            disabled={currentView === 'feed'}
            onClick={() => {
              calendarRef.current.getApi().gotoDate(new Date())
              setCurrentDate(calendarRef.current.getApi().getDate())
            }}
          >
            Today
          </Button>
          <ButtonGroup isAttached>
            <IconButton
              disabled={currentView === 'feed'}
              aria-label="last"
              icon={<FaArrowLeft size={14} />}
              onClick={() => {
                calendarRef.current.getApi().prev()
                setCurrentDate(calendarRef.current.getApi().getDate())
              }}
            />
            <IconButton
              disabled={currentView === 'feed'}
              aria-label="next"
              icon={<FaArrowRight size={14} />}
              onClick={() => {
                calendarRef.current.getApi().next()
                setCurrentDate(calendarRef.current.getApi().getDate())
              }}
            />
          </ButtonGroup>
        </HStack>
        <Spacer />

        <HStack>
          <ButtonGroup isAttached>
            <Button
              isActive={currentView === 'timeGridDay'}
              onClick={() => {
                setCurrentView('timeGridDay')
                calendarRef.current.getApi().changeView('timeGridDay')
              }}
            >
              Day
            </Button>
            <Button
              isActive={currentView === 'timeGridWeek'}
              onClick={() => {
                setCurrentView('timeGridWeek')
                calendarRef.current.getApi().changeView('timeGridWeek')
              }}
            >
              Week
            </Button>
            <Button
              isActive={currentView === 'dayGridMonth'}
              onClick={() => {
                setCurrentView('dayGridMonth')
                calendarRef.current.getApi().changeView('dayGridMonth')
              }}
            >
              Month
            </Button>
            <Button
              isActive={currentView === 'feed'}
              onClick={() => {
                setCurrentView('feed')
              }}
            >
              Feed
            </Button>
          </ButtonGroup>
        </HStack>
      </Flex>
      <VStack display={currentView === 'feed' ? 'none' : 'block'}>
        <Text fontSize="xl" textAlign="center">
          {currentView === 'timeGridDay'
            ? format(currentDate, 'PPP')
            : format(currentDate, 'MMMM yy')}
        </Text>

        <FullCalendar
          ref={calendarRef}
          initialView="timeGridWeek"
          contentHeight={'auto'}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin]}
          events={events}
          headerToolbar={false}
          initialDate={currentDate}
          views={{
            timeGridDay: {
              allDaySlot: false,
            },
            timeGridWeek: {
              allDaySlot: false,
            },
            dayGridMonth: {},
          }}
        />
      </VStack>
      <Box w="100%">
        {currentView === 'feed' &&
          meetings.map(meeting => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              //   onUpdate={fetchMeetings}
            />
          ))}
      </Box>
      {/* {!noMoreFetch && !firstFetch && (
        <Button
          isLoading={loading}
          colorScheme="orange"
          variant="outline"
          alignSelf="center"
          my={4}
          onClick={fetchMeetings}
        >
          Load more
        </Button>
      )} */}
      <Spacer />
    </VStack>
  )
}

export default CalendarView
