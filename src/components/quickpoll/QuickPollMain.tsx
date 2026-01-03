import { Box, TabPanel, TabPanels, Tabs, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import { queryClient } from '@/utils/react_query'

import GuestDetailsForm from './GuestDetailsForm'
import PollSuccessScreen from './PollSuccessScreen'
import QuickPollAvailabilityDiscover from './QuickPollAvailabilityDiscover'

export enum QuickPollPage {
  AVAILABILITY,
  GUEST_DETAILS,
  SUCCESS,
}

interface QuickPollMainProps {
  pollId?: string
  pollData?: QuickPollBySlugResponse
  initialPage?: QuickPollPage
}

const QuickPollMain: React.FC<QuickPollMainProps> = ({
  pollId,
  pollData,
  initialPage = QuickPollPage.AVAILABILITY,
}) => {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState<QuickPollPage>(initialPage)
  const [isProfileUpdateOnly, setIsProfileUpdateOnly] = useState(false)

  // Sync with URL changes
  useEffect(() => {
    if (router.query.tab === 'guest-details') {
      setCurrentPage(QuickPollPage.GUEST_DETAILS)
    } else {
      setCurrentPage(QuickPollPage.AVAILABILITY)
    }
  }, [router.query.tab])

  const handlePageSwitch = (page: QuickPollPage) => {
    setCurrentPage(page)
  }

  const handleGuestDetailsSuccess = (isProfileUpdateOnlyFlag?: boolean) => {
    setIsProfileUpdateOnly(isProfileUpdateOnlyFlag || false)
    handlePageSwitch(QuickPollPage.SUCCESS)
  }

  return (
    <Tabs index={currentPage} isLazy>
      <TabPanels>
        <TabPanel p={0}>
          <Box px={{ base: 0, md: 8 }} py={20}>
            <QuickPollAvailabilityDiscover
              pollId={pollId}
              pollData={pollData}
              onNavigateToGuestDetails={() =>
                handlePageSwitch(QuickPollPage.GUEST_DETAILS)
              }
            />
          </Box>
        </TabPanel>
        <TabPanel p={0}>
          <QuickPollGuestDetailsTab
            pollData={pollData}
            onNavigateBack={() => handlePageSwitch(QuickPollPage.AVAILABILITY)}
            onSuccess={handleGuestDetailsSuccess}
          />
        </TabPanel>
        <TabPanel p={0}>
          <QuickPollSuccessTab
            onDone={() => handlePageSwitch(QuickPollPage.AVAILABILITY)}
            pollTitle={pollData?.poll?.title}
            isProfileUpdateOnly={isProfileUpdateOnly}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}

interface QuickPollGuestDetailsTabProps {
  pollData?: QuickPollBySlugResponse
  onNavigateBack?: () => void
  onSuccess?: (isProfileUpdateOnly?: boolean) => void
}

const QuickPollGuestDetailsTab: React.FC<QuickPollGuestDetailsTabProps> = ({
  pollData,
  onNavigateBack,
  onSuccess,
}) => {
  const handleSuccess = (isProfileUpdateOnly?: boolean) => {
    queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
    queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })
    if (onSuccess) {
      onSuccess(isProfileUpdateOnly)
    }
  }

  if (!pollData?.poll?.slug) {
    return <Box>Loading...</Box>
  }

  return (
    <Box width="100%" minHeight="100vh" bg="bg-canvas-dark">
      <GuestDetailsForm
        pollData={pollData}
        onSuccess={handleSuccess}
        pollTitle="Poll Details"
        onNavigateBack={onNavigateBack}
      />
    </Box>
  )
}

interface QuickPollSuccessTabProps {
  onDone?: () => void
  pollTitle?: string
  isProfileUpdateOnly?: boolean
}

const QuickPollSuccessTab: React.FC<QuickPollSuccessTabProps> = ({
  onDone,
  pollTitle,
  isProfileUpdateOnly = false,
}) => {
  const router = useRouter()

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
    queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })

    const basePath = router.asPath.split('?')[0]
    router.push(basePath, undefined, { shallow: true })

    if (onDone) {
      onDone()
    }
  }

  return (
    <Box
      width="100%"
      minHeight="100vh"
      bg="bg-canvas-dark"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <PollSuccessScreen
        isOpen={true}
        onClose={handleDone}
        pollTitle={pollTitle}
        isProfileUpdateOnly={isProfileUpdateOnly}
      />
    </Box>
  )
}

export default QuickPollMain
