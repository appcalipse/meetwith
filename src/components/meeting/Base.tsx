import {
  Box,
  HStack,
  Image,
  Spacer,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import {
  InfiniteData,
  QueryKey,
  UseInfiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'

import { ActionsContext } from '@/providers/schedule/ActionsContext'
import { Account } from '@/types/Account'
import {
  AttendeeStatus,
  DashBoardMwwEvents,
  DashboardEvent,
  ExtendedCalendarEvents,
  UnifiedEvent,
} from '@/types/Calendar'
import { Intents } from '@/types/Dashboard'
import {
  ExtendedDBSlot,
  MeetingChangeType,
  MeetingDecrypted,
} from '@/types/Meeting'
import { ParticipantInfo, ParticipationStatus } from '@/types/ParticipantInfo'
import { getCalendarEvents, getMeeting } from '@/utils/api_helper'
import { decodeMeeting, deleteMeeting } from '@/utils/calendar_manager'
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
import QueryKeys from '@/utils/query_keys'
import { useCancelDialog } from '../schedule/cancel.dialog.hook'
import { useMeetingDialog } from '../schedule/meeting.dialog.hook'
import CalendarEventCard from './CalendarEventCard'
import MeetingCard from './MeetingCard'

interface MeetingBaseProps {
  currentAccount: Account
}

const isCalendarEvent = (event: DashboardEvent): event is UnifiedEvent => {
  return 'calendarId' in event
}

interface MeetingsQueryConfig {
  currentAccount: Account
  timeWindow: {
    start: DateTime
    end: DateTime
  }
}
const WEEKS_TO_LOAD = 1
const createMeetingsQueryConfig = ({
  currentAccount,
  timeWindow,
}: MeetingsQueryConfig): UseInfiniteQueryOptions<
  ExtendedCalendarEvents,
  unknown,
  ExtendedCalendarEvents,
  ExtendedCalendarEvents,
  QueryKey
> => ({
  queryKey: QueryKeys.meetingsByAccount(currentAccount.address),
  queryFn: async ({ pageParam: offset = 0 }) => {
    const meetings = await getCalendarEvents(
      timeWindow.start.plus({ weeks: offset }),
      timeWindow.end.plus({ weeks: offset }),
      currentAccount,
      true
    )

    return meetings
  },
  getNextPageParam: (_, allPages) => allPages.length * WEEKS_TO_LOAD,
  staleTime: 30_000,
  refetchOnWindowFocus: true,
})

const MeetingBase: FC<MeetingBaseProps> = ({ currentAccount }) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const queryClient = useQueryClient()
  const startWindow = useMemo(
    () => ({
      start: DateTime.now().startOf('hour'),
      end: DateTime.now().plus({ weeks: WEEKS_TO_LOAD }),
    }),
    []
  )

  const queryConfig = createMeetingsQueryConfig({
    currentAccount,
    timeWindow: startWindow,
  })
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery<ExtendedCalendarEvents>(queryConfig)

  const updateAttendeeStatus = useCallback(
    (eventId: string, accountEmail: string, status: AttendeeStatus) => {
      queryClient.setQueriesData<InfiniteData<ExtendedCalendarEvents>>(
        { queryKey: ['meetings', currentAccount.address] },
        old => {
          if (!old?.pages) return old

          const updatedPages = old.pages.map(page => {
            if (!page?.calendarEvents) return page

            const hasTargetEvent = page.calendarEvents.some(
              (event: UnifiedEvent) => event.sourceEventId === eventId
            )
            if (!hasTargetEvent) return page

            return {
              ...page,
              calendarEvents: page.calendarEvents.map((event: UnifiedEvent) => {
                if (event.sourceEventId !== eventId) return event

                return {
                  ...event,
                  attendees: event.attendees?.map(attendee =>
                    attendee.email === accountEmail
                      ? { ...attendee, status }
                      : attendee
                  ),
                }
              }),
            }
          })

          return {
            ...old,
            pages: updatedPages,
          }
        }
      )
    },
    [queryClient, currentAccount.address]
  )
  const updateParticipationStatus = useCallback(
    (eventId: string, accountAddress: string, status: ParticipationStatus) => {
      queryClient.setQueriesData<InfiniteData<ExtendedCalendarEvents>>(
        { queryKey: ['meetings', currentAccount.address] },
        old => {
          if (!old?.pages) return old

          const updatedPages = old.pages.map(page => {
            if (!page?.mwwEvents) return page

            const hasTargetEvent = page.mwwEvents.some(
              (event: DashBoardMwwEvents) => event.id === eventId
            )
            if (!hasTargetEvent) return page

            return {
              ...page,
              mwwEvents: page.mwwEvents.map(event => {
                if (event.id !== eventId) return event

                return {
                  ...event,
                  participants: event.decrypted.participants.map(participant =>
                    participant.account_address === accountAddress
                      ? { ...participant, status }
                      : participant
                  ),
                }
              }),
            }
          })

          return {
            ...old,
            pages: updatedPages,
          }
        }
      )
    },
    [queryClient, currentAccount.address]
  )
  const removeEventFromCache = useCallback(
    (eventId: string) => {
      queryClient.setQueriesData<InfiniteData<ExtendedCalendarEvents>>(
        { queryKey: ['meetings', currentAccount.address] },
        old => {
          if (!old?.pages) return old

          const updatedPages = old.pages.map(page => {
            if (!page?.calendarEvents) return page

            const hasTargetEvent = page.calendarEvents.some(
              (event: UnifiedEvent) => event.sourceEventId === eventId
            )
            if (!hasTargetEvent) return page

            return {
              ...page,
              calendarEvents: page.calendarEvents.filter(
                (event: UnifiedEvent) => event.sourceEventId !== eventId
              ),
            }
          })

          return {
            ...old,
            pages: updatedPages,
          }
        }
      )
    },
    [queryClient, currentAccount.address]
  )
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      const prefetch = () => {
        void queryClient.prefetchInfiniteQuery(queryConfig)
      }

      if ('requestIdleCallback' in window) {
        const id = requestIdleCallback(prefetch, { timeout: 2000 })
        return () => cancelIdleCallback(id)
      } else {
        const timer = setTimeout(prefetch, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, queryClient])
  const meetings: DashboardEvent[] = useMemo(() => {
    if (!data) return []
    const now = DateTime.now()
    const allEvents: DashboardEvent[] = data.pages
      .flatMap(data => [...data.mwwEvents, ...data.calendarEvents])
      .map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }))
      .filter(event => DateTime.fromJSDate(event.start) >= now) // ← Add this
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    return allEvents
  }, [data])
  const toast = useToast()

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const { query } = useRouter()
  const { slotId, intent } = query as {
    slotId: string
    intent: Intents
  }
  const [MeetingDialog, openMeetingDialog] = useMeetingDialog()
  const { CancelDialog, openCancelDialog } = useCancelDialog()
  const afterClose = async (
    changeType: MeetingChangeType,
    meeting?: ExtendedDBSlot,
    removedSlots?: string[],
    skipToast?: boolean
  ) => {
    // not using router API to avoid re-rendering component
    history.pushState(null, '', window.location.pathname)

    if (meeting || removedSlots) {
      await queryClient.invalidateQueries({
        queryKey: ['meetings', currentAccount.address],
      })

      if (skipToast) return

      let title, description
      switch (changeType) {
        case MeetingChangeType.CREATE:
          title = 'Scheduled'
          description = 'Meeting scheduled successfully.'
          break
        case MeetingChangeType.UPDATE:
          title = 'Updated'
          description = 'Meeting updated successfully.'
          break
        case MeetingChangeType.DELETE:
          title = 'Canceled'
          description = 'Meeting canceled successfully.'
          break
      }
      toast({
        title,
        description,
        status: 'success',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
    }
  }

  useEffect(() => {
    if (!slotId) return

    const fillMeeting = async () => {
      try {
        const meeting = await getMeeting(slotId)
        const decodedMeeting = await decodeMeeting(meeting, currentAccount)
        if (!decodedMeeting) return
        if (intent === Intents.CANCEL_MEETING) {
          openCancelDialog(
            meeting,
            decodedMeeting ?? undefined,
            afterClose,
            currentAccount
          )
        } else {
          openMeetingDialog(meeting, decodedMeeting, timezone, afterClose)
        }
      } catch (e) {
        console.error('Failed to load meeting:', e)
      }
    }

    void fillMeeting()
  }, [slotId, intent, currentAccount, timezone])

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
        decryptedMeeting,
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
  useEffect(() => {
    if (isLoading || !hasNextPage || !loadMoreRef.current || isFetchingNextPage)
      return

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries
        if (entry && entry.isIntersecting) {
          void fetchNextPage()
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasNextPage, isLoading, isFetchingNextPage, loadMoreRef.current])

  const context = {
    handleDelete,
    handleSchedule: async () => {},
    handleCancel: () => {},
  }
  let content: ReactNode

  if (isLoading) {
    content = (
      <VStack alignItems="center" mb={8}>
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking your schedule...</Text>
        </HStack>
      </VStack>
    )
  } else if (isError) {
    content = (
      <VStack alignItems="center" mb={8}>
        <Text fontSize="lg" color="red.500">
          Failed to load meetings. Please try again.
        </Text>
      </VStack>
    )
  } else if (meetings.length === 0) {
    content = (
      <VStack alignItems="center" mb={8}>
        <Image src="/assets/no_meetings.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Text fontSize="lg">You have no scheduled meetings</Text>
        </HStack>
      </VStack>
    )
  } else {
    content = (
      <VStack mb={8}>
        {meetings.map(event => {
          if (isCalendarEvent(event)) {
            return (
              <CalendarEventCard
                key={event.sourceEventId}
                event={event}
                timezone={timezone}
                updateAttendeeStatus={updateAttendeeStatus}
                removeEventFromCache={removeEventFromCache}
              />
            )
          } else {
            return (
              <MeetingCard
                key={event.id}
                meeting={event}
                updateParticipationStatus={updateParticipationStatus}
                timezone={timezone}
                onCancel={(removed: string[], skipToast?: boolean) =>
                  afterClose(
                    MeetingChangeType.DELETE,
                    undefined,
                    removed,
                    skipToast
                  )
                }
              />
            )
          }
        })}
        {hasNextPage && (
          <Box
            ref={loadMoreRef}
            w="100%"
            h="20px"
            display="flex"
            justifyContent="center"
            alignItems="center"
            my={4}
          >
            {isFetchingNextPage && <Spinner size="md" color="primary.500" />}
          </Box>
        )}
        {!hasNextPage && meetings.length > 0 && (
          <Text color="gray.500" fontSize="sm" textAlign="center" my={4}>
            No more meetings to load
          </Text>
        )}
        <Spacer />
      </VStack>
    )
  }

  return (
    <ActionsContext.Provider value={context}>
      {content}
      <MeetingDialog />
      <CancelDialog />
    </ActionsContext.Provider>
  )
}

export default MeetingBase
