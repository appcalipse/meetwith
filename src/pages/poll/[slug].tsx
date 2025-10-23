import { Box } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'

import CustomError from '@/components/CustomError'
import CustomLoading from '@/components/CustomLoading'
import QuickPollMain, {
  QuickPollPage,
} from '@/components/quickpoll/QuickPollMain'
import { AvailabilityTrackerProvider } from '@/components/schedule/schedule-time-discover/AvailabilityTracker'
import useAccountContext from '@/hooks/useAccountContext'
import { QuickPollAvailabilityProvider } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'
import {
  QuickPollBySlugResponse,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { getQuickPollBySlug } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

const PollPage = () => {
  const router = useRouter()
  const { slug, tab, participantId } = router.query
  const currentAccount = useAccountContext()

  let initialPage = QuickPollPage.AVAILABILITY
  if (tab === 'guest-details') {
    initialPage = QuickPollPage.GUEST_DETAILS
  }

  // Fetch poll data using React Query
  const {
    data: pollData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quickpoll-public', slug],
    queryFn: () => getQuickPollBySlug(slug as string),
    enabled: !!slug && typeof slug === 'string',
    onError: (err: unknown) => {
      handleApiError('Failed to load poll', err)
    },
  })

  if (!router.isReady || isLoading) {
    return <CustomLoading text="Loading poll..." />
  }

  if (error) {
    const errorObj = error as any
    let title = 'Failed to load poll'
    let description =
      "We couldn't load this poll. Please check the link and try again."

    if (errorObj?.status === 404) {
      title = 'Poll not found'
      description = "This poll doesn't exist or may have been deleted."
    } else if (errorObj?.status === 410) {
      title = 'Poll expired'
      description =
        'This poll has expired and is no longer accepting responses.'
    }

    return (
      <Box width="100%" minHeight="100vh" bg="bg-canvas" p={6}>
        <CustomError
          title={title}
          description={description}
          imageAlt="Poll error"
        />
      </Box>
    )
  }

  // Handle missing data
  if (!pollData) {
    return (
      <Box width="100%" minHeight="100vh" bg="bg-canvas" p={6}>
        <CustomError
          title="Poll not found"
          description="This poll doesn't exist or may have been deleted."
          imageAlt="Poll not found"
        />
      </Box>
    )
  }

  const shouldSkipFetching = !currentAccount

  return (
    <Box width="100%" minHeight="100vh" bg="bg-canvas">
      <QuickPollAvailabilityProvider
        initialParticipantId={participantId as string}
      >
        <ScheduleStateProvider>
          <NavigationProvider>
            <ParticipantsProvider skipFetching={shouldSkipFetching}>
              <PermissionsProvider>
                <AvailabilityTrackerProvider>
                  <QuickPollMain
                    pollData={pollData as QuickPollBySlugResponse}
                    initialPage={initialPage}
                  />
                </AvailabilityTrackerProvider>
              </PermissionsProvider>
            </ParticipantsProvider>
          </NavigationProvider>
        </ScheduleStateProvider>
      </QuickPollAvailabilityProvider>
    </Box>
  )
}

export default PollPage
