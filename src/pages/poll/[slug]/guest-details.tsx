import { Box } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import CustomError from '@/components/CustomError'
import CustomLoading from '@/components/CustomLoading'
import GuestDetailsForm from '@/components/quickpoll/GuestDetailsForm'
import PollSuccessScreen from '@/components/quickpoll/PollSuccessScreen'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import { getQuickPollBySlug } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

const GuestDetailsPage = () => {
  const router = useRouter()
  const { slug, participantId } = router.query
  const [isReady, setIsReady] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

  useEffect(() => {
    if (router.isReady) {
      setIsReady(true)
    }
  }, [router.isReady])

  useEffect(() => {
    if (isReady && !participantId) {
      router.push(`/poll/${slug}`)
    }
  }, [isReady, participantId, router, slug])

  if (!isReady || isLoading) {
    return <CustomLoading text="Loading..." />
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
      <Box width="100%" minHeight="100vh" bg="neutral.850" p={6}>
        <CustomError
          title={title}
          description={description}
          imageAlt="Poll error"
        />
      </Box>
    )
  }

  // Handle missing data
  if (!pollData || !participantId) {
    return (
      <Box width="100%" minHeight="100vh" bg="neutral.850" p={6}>
        <CustomError
          title="Poll not found"
          description="This poll doesn't exist or may have been deleted."
          imageAlt="Poll not found"
        />
      </Box>
    )
  }

  const handleSuccess = () => {
    setShowSuccess(true)
  }

  const handleBackToPoll = () => {
    router.push(`/poll/${slug}`)
  }

  return (
    <Box width="100%" minHeight="100vh" bg="neutral.850">
      {showSuccess ? (
        <PollSuccessScreen
          isOpen={true}
          onClose={handleBackToPoll}
          pollTitle={(pollData as QuickPollBySlugResponse).poll.title}
        />
      ) : (
        <GuestDetailsForm
          participantId={participantId as string}
          onSuccess={handleSuccess}
          pollTitle={(pollData as QuickPollBySlugResponse).poll.title}
        />
      )}
    </Box>
  )
}

export default GuestDetailsPage
