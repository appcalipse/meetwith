import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import CustomLoading from '@/components/CustomLoading'
import { Account } from '@/types/Account'
import { getQuickPolls } from '@/utils/api_helper'
import { QUICKPOLL_MIN_LIMIT } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'

import AllPolls from './AllPolls'
import FeatureCards from './FeatureCards'

interface QuickPollProps {
  currentAccount: Account
}

const QuickPoll = ({ currentAccount: _currentAccount }: QuickPollProps) => {
  const { push } = useRouter()

  // Check if user has existing polls
  const { data: pollsData, isLoading } = useQuery({
    queryKey: ['quickpolls-check'],
    queryFn: () => getQuickPolls(QUICKPOLL_MIN_LIMIT, 0),
    onError: (err: unknown) => {
      handleApiError('Failed to check polls', err)
    },
  })

  if (isLoading) {
    return <CustomLoading text="Loading polls..." />
  }

  const hasExistingPolls = (pollsData?.polls?.length || 0) > 0

  // If user has existing polls
  if (hasExistingPolls) {
    return <AllPolls />
  }

  // Otherwise, show the intro page
  const featureCards = [
    {
      icon: FaCalendarAlt,
      title: 'Create a poll',
      description: 'Set up your meeting details and available time slots',
    },
    {
      icon: FaUsers,
      title: 'Add participants from existing groups and from your contact',
      description: 'Include people from your groups and contacts',
    },
    {
      icon: FaLink,
      title: 'Share public link for others to provide their availability',
      description: 'Send a public link for others to enter their free times',
    },
    {
      icon: FaClock,
      title: 'Schedule meeting',
      description: 'Review responses and finalise the meeting time',
    },
  ]

  return (
    <Box
      width="100%"
      bg="neutral.850"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <VStack spacing={8} align="center" maxW="800px">
        {/* Header Section */}
        <VStack spacing={2} align="center">
          <Heading
            as="h1"
            fontSize="31.25px"
            fontWeight="700"
            color="neutral.0"
            textAlign="center"
          >
            Welcome to QuickPoll
          </Heading>
          <Text
            fontSize="16px"
            color="neutral.200"
            fontWeight="500"
            textAlign="center"
          >
            Schedule group calls easily
          </Text>
        </VStack>

        {/* Feature Cards Grid */}
        <FeatureCards cards={featureCards} />

        {/* Call to Action Button */}
        <Flex justify="center" pt={1}>
          <Button
            leftIcon={<HiMiniPlusCircle color="neutral.800" size={16} />}
            bg="primary.200"
            color="neutral.900"
            size="lg"
            px={4}
            py={4}
            fontSize="md"
            fontWeight="semibold"
            borderRadius="8px"
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            transition="all 0.2s ease-in-out"
            onClick={() => push(`/dashboard/create-poll`)}
          >
            Run new poll
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}

export default QuickPoll
