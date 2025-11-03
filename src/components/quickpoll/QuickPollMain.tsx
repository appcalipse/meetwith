import { Box, TabPanel, TabPanels, Tabs, VStack } from '@chakra-ui/react'
import React, { useState } from 'react'

import { useQuickPollAvailability } from '@/providers/quickpoll/QuickPollAvailabilityContext'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

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
  const [currentPage, setCurrentPage] = useState<QuickPollPage>(initialPage)

  const handlePageSwitch = (page: QuickPollPage) => {
    setCurrentPage(page)
  }

  return (
    <Tabs index={currentPage} isLazy>
      <TabPanels>
        <TabPanel p={0}>
          <Box px={8} py={20}>
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
            onSuccess={() => handlePageSwitch(QuickPollPage.SUCCESS)}
          />
        </TabPanel>
        <TabPanel p={0}>
          <QuickPollSuccessTab
            onDone={() => handlePageSwitch(QuickPollPage.AVAILABILITY)}
            pollTitle={pollData?.poll?.title}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}

interface QuickPollGuestDetailsTabProps {
  pollData?: QuickPollBySlugResponse
  onNavigateBack?: () => void
  onSuccess?: () => void
}

const QuickPollGuestDetailsTab: React.FC<QuickPollGuestDetailsTabProps> = ({
  pollData,
  onNavigateBack,
  onSuccess,
}) => {
  const { showSuccessToast } = useToastHelpers()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
    queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })

    showSuccessToast(
      'Details saved successfully',
      'Your availability and details have been saved.'
    )
    if (onSuccess) {
      onSuccess()
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
}

const QuickPollSuccessTab: React.FC<QuickPollSuccessTabProps> = ({
  onDone,
  pollTitle,
}) => {
  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ['quickpoll-public'] })
    queryClient.invalidateQueries({ queryKey: ['quickpoll-schedule'] })
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
      />
    </Box>
  )
}

export default QuickPollMain
