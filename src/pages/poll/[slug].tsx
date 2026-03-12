import { Box } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

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
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import { getQuickPollBySlug } from '@/utils/api_helper'
import { isJson } from '@/utils/generic_utils'
import { getQuickPollSignInContext } from '@/utils/storage'

const PollPage = () => {
  const router = useRouter()
  const { slug, tab, participantId } = router.query
  const currentAccount = useAccountContext()

  useEffect(() => {
    if (!currentAccount?.address || typeof slug !== 'string' || !router.isReady)
      return
    const context = getQuickPollSignInContext()
    if (!context || context.pollSlug !== slug) return
    // No-op: stay on poll page.
  }, [currentAccount?.address, slug, router.isReady])

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
    enabled: !!slug && typeof slug === 'string',
    queryFn: () => getQuickPollBySlug(slug as string),
    queryKey: ['quickpoll-public', slug],
  })

  if (!router.isReady || isLoading) {
    return <CustomLoading text="Loading poll..." />
  }

  if (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "We couldn't load this poll. Please check the link and try again."
    let description = rawMessage
    if (isJson(rawMessage)) {
      try {
        const parsed = JSON.parse(rawMessage) as { error?: string }
        if (typeof parsed?.error === 'string') description = parsed.error
      } catch {
        description = rawMessage
      }
    }

    return (
      <Box bg="bg-canvas" minHeight="100vh" p={6} width="100%">
        <CustomError
          description={description}
          imageAlt="Poll error"
          title="Failed to load poll"
        />
      </Box>
    )
  }

  // Handle missing data
  if (!pollData) {
    return (
      <Box bg="bg-canvas" minHeight="100vh" p={6} width="100%">
        <CustomError
          description="This poll doesn't exist or may have been deleted."
          imageAlt="Poll not found"
          title="Poll not found"
        />
      </Box>
    )
  }

  const shouldSkipFetching = !currentAccount

  return (
    <Box bg="bg-canvas" minHeight="100vh" width="100%">
      <QuickPollAvailabilityProvider
        initialParticipantId={participantId as string}
      >
        <ScheduleStateProvider>
          <NavigationProvider>
            <ParticipantsProvider skipFetching={shouldSkipFetching}>
              <PermissionsProvider>
                <AvailabilityTrackerProvider>
                  <QuickPollMain
                    initialPage={initialPage}
                    pollData={pollData as QuickPollBySlugResponse}
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
