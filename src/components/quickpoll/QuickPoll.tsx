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
  const canCreateQuickPoll = !pollsData?.upgradeRequired

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
      bg="bg-canvas"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 2, md: 4 }}
      py={{ base: 6, md: 8 }}
    >
      <VStack
        spacing={{ base: 6, md: 8 }}
        align="center"
        maxW="800px"
        w={{ base: '100%', md: 'auto' }}
      >
        {/* Header Section */}
        <VStack
          spacing={{ base: 3, md: 2 }}
          align="center"
          order={{ base: 1, md: 1 }}
        >
          <Heading
            as="h1"
            fontSize={{ base: '24px', md: '31.25px' }}
            fontWeight="700"
            color="text-primary"
            textAlign="center"
            lineHeight="1.2"
          >
            Welcome to QuickPoll
          </Heading>
          <Text
            fontSize={{ base: '14px', md: '16px' }}
            color="text-secondary"
            fontWeight="500"
            textAlign="center"
          >
            Schedule group calls easily
          </Text>
        </VStack>

        <Flex justify="center" w="100%" order={{ base: 2, md: 3 }}>
          <Button
            leftIcon={<HiMiniPlusCircle color="text-primary" size={16} />}
            bg="primary.200"
            color="neutral.900"
            size={{ base: 'md', md: 'lg' }}
            px={{ base: 6, md: 4 }}
            py={{ base: 3, md: 4 }}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="semibold"
            borderRadius="8px"
            w={{ base: '100%', sm: 'auto' }}
            maxW={{ base: '280px', sm: 'none' }}
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            transition="all 0.2s ease-in-out"
            onClick={() => push(`/dashboard/create-poll`)}
            isDisabled={!canCreateQuickPoll}
            title={
              !canCreateQuickPoll
                ? 'Upgrade to Pro to create more active polls'
                : undefined
            }
          >
            Run new poll
          </Button>
        </Flex>

        {/* Feature Cards Grid */}
        <Box w="100%" order={{ base: 3, md: 2 }}>
          <FeatureCards cards={featureCards} />
        </Box>
      </VStack>
    </Box>
  )
}

export default QuickPoll
