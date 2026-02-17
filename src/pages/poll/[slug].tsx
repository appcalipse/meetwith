import { Box } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'

import CustomError from '@/components/CustomError'
import CustomLoading from '@/components/CustomLoading'
import QuickPollMain, {
  QuickPollPage,
} from '@/components/quickpoll/QuickPollMain'
import { AvailabilityTrackerProvider } from '@/components/schedule/schedule-time-discover/AvailabilityTracker'
import useAccountContext from '@/hooks/useAccountContext'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { QuickPollAvailabilityProvider } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'
import { NotificationChannel } from '@/types/AccountNotifications'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import {
  getNotificationSubscriptions,
  getQuickPollBySlug,
  joinQuickPollAsParticipant,
} from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { ApiFetchError } from '@/utils/errors'
import { isJson } from '@/utils/generic_utils'
import {
  clearQuickPollSignInContext,
  getQuickPollSignInContext,
} from '@/utils/storage'
import { useToastHelpers } from '@/utils/toasts'

const PollPage = () => {
  const router = useRouter()
  const { slug, tab, participantId } = router.query
  const currentAccount = useAccountContext()
  const { isOnboardingOpened } = useContext(OnboardingModalContext)
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  const { data: notifications } = useQuery({
    queryKey: ['notification-subscriptions', currentAccount?.address],
    queryFn: getNotificationSubscriptions,
    enabled: !!currentAccount?.address,
  })
  const accountEmail =
    notifications?.notification_types?.find(
      n => n.channel === NotificationChannel.EMAIL && !n.disabled
    )?.destination ?? ''

  // When user returns from sign-in/sign-up with poll context: add to poll immediately and redirect
  useEffect(() => {
    if (
      !currentAccount?.address ||
      typeof slug !== 'string' ||
      !router.isReady ||
      isOnboardingOpened
    ) {
      return
    }
    const context = getQuickPollSignInContext()
    if (!context || context.pollSlug !== slug) return

    clearQuickPollSignInContext()
    const pollIdToJoin = context.pollId

    let cancelled = false
    const run = async () => {
      try {
        const displayName =
          currentAccount.preferences?.name || currentAccount.address
        const { alreadyInPoll } = await joinQuickPollAsParticipant(
          pollIdToJoin,
          accountEmail || undefined,
          displayName
        )
        if (cancelled) return
        if (alreadyInPoll) {
          showSuccessToast(
            'You are already part of the poll',
            'Redirecting you to the poll.'
          )
        } else {
          showSuccessToast(
            "You've been added to the poll",
            'Redirecting you to add your availability.'
          )
        }
        await router.push(
          `/dashboard/schedule?ref=quickpoll&pollId=${pollIdToJoin}&intent=edit_availability`
        )
      } catch (error) {
        if (!cancelled) {
          handleApiError('Failed to join poll', error)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    currentAccount?.address,
    currentAccount?.preferences?.name,
    slug,
    router.isReady,
    isOnboardingOpened,
    accountEmail,
  ])

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
    onError: (err: unknown) => {
      handleApiError('Failed to load poll', err)
    },
    queryFn: () => getQuickPollBySlug(slug as string),
    queryKey: ['quickpoll-public', slug],
  })

  if (!router.isReady || isLoading) {
    return <CustomLoading text="Loading poll..." />
  }

  if (error) {
    const errorObj = error instanceof ApiFetchError ? error : undefined
    let title = 'Failed to load poll'
    let description =
      "We couldn't load this poll. Please check the link and try again."

    if (errorObj?.status === 404) {
      title = 'Poll not found'
      description = "This poll doesn't exist or may have been deleted."
    } else if (errorObj?.status === 410) {
      const rawMessage =
        typeof errorObj?.message === 'string' ? errorObj.message.trim() : ''

      let parsedMessage = rawMessage
      if (isJson(rawMessage)) {
        try {
          const parsed = JSON.parse(rawMessage)
          parsedMessage =
            (parsed?.message as string | undefined)?.trim() ??
            (parsed?.error as string | undefined)?.trim() ??
            rawMessage
        } catch {
          parsedMessage = rawMessage
        }
      }

      title = 'Unable to load poll'
      description =
        parsedMessage ||
        'This poll is no longer available and cannot be viewed.'
    }

    return (
      <Box bg="bg-canvas" minHeight="100vh" p={6} width="100%">
        <CustomError
          description={description}
          imageAlt="Poll error"
          title={title}
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
