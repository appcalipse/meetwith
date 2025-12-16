import { Drawer, DrawerBody, DrawerContent, useToast } from '@chakra-ui/react'
import * as React from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { ActionsContext } from '@/providers/schedule/ActionsContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'
import { isCalendarEventWithoutDateTime } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { deleteMeeting } from '@/utils/calendar_manager'
import { NO_MEETING_TYPE } from '@/utils/constants/meeting-types'
import { handleApiError } from '@/utils/error_helper'
import {
  GateConditionNotValidError,
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  InvalidURL,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  TimeNotAvailableError,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@/utils/errors'
import { getSignature } from '@/utils/storage'

import ActiveCalendarEvent from './ActiveCalendarEvent'
import ActiveMeetwithEvent from './ActiveMeetwithEvent'
const ActiveEvent: React.FC = ({}) => {
  const { selectedSlot, setSelectedSlot } = useCalendarContext()
  const currentAccount = useAccountContext()
  const toast = useToast()

  const handleDelete = async (
    actor?: ParticipantInfo,
    decryptedMeeting?: MeetingDecrypted
  ) => {
    if (!decryptedMeeting) return
    try {
      const meeting = await deleteMeeting(
        true,
        currentAccount?.address || '',
        NO_MEETING_TYPE,
        decryptedMeeting?.start,
        decryptedMeeting?.end,
        decryptedMeeting,
        getSignature(currentAccount?.address || '') || '',
        actor
      )
      toast({
        title: 'Meeting Deleted',
        description: 'The meeting was deleted successfully',
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return meeting
    } catch (e: unknown) {
      if (e instanceof MeetingWithYourselfError) {
        toast({
          title: "Ops! Can't do that",
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof TimeNotAvailableError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'The selected time is not available anymore',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GateConditionNotValidError) {
        toast({
          title: 'Failed to delete meeting',
          description: e.message,
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingCreationError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'A meeting requires at least two participants. Please add more participants to schedule the meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MultipleSchedulersError) {
        toast({
          title: 'Failed to delete meeting',
          description: 'A meeting must have only one scheduler',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof MeetingChangeConflictError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'Someone else has updated this meeting. Please reload and try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof InvalidURL) {
        toast({
          title: 'Failed to delete meeting',
          description: 'Please provide a valid url/link for your meeting.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof Huddle01ServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Huddle01 seems to be offline. Please select a custom meeting link, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof ZoomServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Zoom seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof GoogleServiceUnavailable) {
        toast({
          title: 'Failed to create video meeting',
          description:
            'Google seems to be offline. Please select a different meeting location, or try again.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else if (e instanceof UrlCreationError) {
        toast({
          title: 'Failed to delete meeting',
          description:
            'There was an issue generating a meeting url for your meeting. try using a different location',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else {
        handleApiError('Error deleting meeting', e)
      }
    }
  }
  const context = {
    handleDelete,
    handleSchedule: async () => {},
    handleCancel: () => {},
  }
  return (
    <ActionsContext.Provider value={context}>
      <Drawer
        isOpen={!!selectedSlot}
        placement="right"
        onClose={() => setSelectedSlot(null)}
      >
        <DrawerContent maxW="500px">
          <DrawerBody p={'30px'}>
            {selectedSlot &&
              (isCalendarEventWithoutDateTime(selectedSlot) ? (
                <ActiveCalendarEvent slot={selectedSlot} />
              ) : (
                <ParticipantsProvider>
                  <ScheduleStateProvider
                    {...{
                      title: selectedSlot?.title,
                      content: selectedSlot?.content || '',
                      duration: Math.ceil(
                        (selectedSlot.end.getTime() -
                          selectedSlot.start.getTime()) /
                          60000
                      ),
                      pickedTime: selectedSlot?.start,
                      currentSelectedDate: selectedSlot?.start,
                      timezone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                      meetingProvider: selectedSlot?.provider,
                      meetingUrl: selectedSlot?.meeting_url || '',
                      meetingNotification: [],
                      isScheduling: false,
                      selectedPermissions: undefined,
                      decryptedMeeting: selectedSlot,
                    }}
                  >
                    <ActiveMeetwithEvent slot={selectedSlot} />
                  </ScheduleStateProvider>
                </ParticipantsProvider>
              ))}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </ActionsContext.Provider>
  )
}

export default ActiveEvent
