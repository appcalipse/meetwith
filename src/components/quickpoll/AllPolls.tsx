import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import { useDebounceValue } from '@/hooks/useDebounceValue'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { PollStatus } from '@/types/QuickPoll'
import { getQuickPolls } from '@/utils/api_helper'
import { QUICKPOLL_MIN_LIMIT } from '@/utils/constants'

import CountSkeleton from './CountSkeleton'
import OngoingPolls from './OngoingPolls'
import PastPolls from './PastPolls'

const AllPolls = () => {
  const { push } = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500)

  // Fetch metadata to get upgradeRequired status
  const { data: pollsMetadata } = useQuery({
    queryKey: ['quickpolls-metadata'],
    queryFn: () =>
      getQuickPolls(QUICKPOLL_MIN_LIMIT, 0, undefined, PollStatus.ONGOING),
    staleTime: 30000,
  })
  const canCreateQuickPoll = !pollsMetadata?.upgradeRequired

  const {
    ongoingPollsCount,
    pastPollsCount,
    fetchPollCounts,
    isLoadingPollCounts,
  } = useContext(MetricStateContext)

  useEffect(() => {
    void fetchPollCounts(debouncedSearchQuery)
  }, [debouncedSearchQuery])

  const handleTabChange = (index: number) => {
    setActiveTab(index)
  }

  return (
    <Box width="100%" bg="bg-canvas" minHeight="100vh">
      <VStack
        spacing={{ base: 4, md: 6 }}
        align="stretch"
        maxW="1200px"
        mx="auto"
        pb={10}
      >
        {/* Header Section */}
        <Flex
          justify="space-between"
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: 4, md: 0 }}
        >
          <VStack align="start" spacing={1}>
            <Heading
              as="h1"
              fontSize={{ base: '20px', md: '24px' }}
              fontWeight="700"
              color="text-primary"
              textAlign="left"
            >
              Quick Poll for Groups
            </Heading>
            <Text
              fontSize={{ base: '14px', md: '16px' }}
              color="neutral.400"
              fontWeight="500"
              textAlign="left"
            >
              Coordinate availability across teams without the email chains
            </Text>
          </VStack>

          <VStack align={{ base: 'stretch', md: 'flex-end' }} spacing={2}>
            <Button
              leftIcon={<HiMiniPlusCircle size={20} color="#323F4B" />}
              bg="primary.200"
              color="neutral.900"
              px={5}
              py={2.5}
              fontSize="15px"
              fontWeight="600"
              borderRadius="8px"
              w={{ base: '100%', md: 'auto' }}
              _hover={{
                bg: 'primary.300',
              }}
              _active={{
                bg: 'primary.400',
              }}
              onClick={() => push('/dashboard/create-poll')}
              isDisabled={!canCreateQuickPoll}
              title={
                !canCreateQuickPoll
                  ? 'Upgrade to Pro to create more active polls'
                  : undefined
              }
            >
              Run new poll
            </Button>
            {!canCreateQuickPoll && (
              <Text
                fontSize="14px"
                color="neutral.400"
                textAlign={{ base: 'left', md: 'right' }}
              >
                Unlock unlimited QuickPolls with PRO{' '}
                <Button
                  variant="link"
                  colorScheme="primary"
                  px={0}
                  onClick={() => push('/dashboard/settings/subscriptions')}
                  textDecoration="underline"
                  fontSize="14px"
                  height="auto"
                  minW="auto"
                >
                  here
                </Button>
                .
              </Text>
            )}
          </VStack>
        </Flex>

        {/* Tabs with Search Section */}
        <Tabs variant="unstyled" index={activeTab} onChange={handleTabChange}>
          <Flex
            justify="space-between"
            align="center"
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 4, md: 0 }}
          >
            {/* Tabs */}
            <TabList
              bg="bg-surface-secondary"
              p={1}
              borderWidth={1}
              borderColor="neutral.400"
              rounded={6}
              width={{ base: '100%', md: 'fit-content' }}
            >
              <Tab
                rounded={4}
                px={{ base: 3, md: 4 }}
                py={2}
                fontWeight={600}
                fontSize={{ base: '13px', md: '14px' }}
                color="text-primary"
                flex={{ base: 1, md: 'none' }}
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Ongoing Polls (
                {isLoadingPollCounts ? <CountSkeleton /> : ongoingPollsCount})
              </Tab>
              <Tab
                rounded={4}
                px={{ base: 3, md: 4 }}
                py={2}
                fontWeight={600}
                fontSize={{ base: '13px', md: '14px' }}
                color="text-primary"
                flex={{ base: 1, md: 'none' }}
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Past Polls (
                {isLoadingPollCounts ? <CountSkeleton /> : pastPollsCount})
              </Tab>
            </TabList>

            {/* Search Input */}
            <InputGroup maxW={{ base: '100%', md: '275px' }} maxH="48px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="neutral.500" />
              </InputLeftElement>
              <Input
                placeholder="Search for Poll"
                bg="bg-surface-secondary"
                border="1px solid"
                borderColor="neutral.400"
                color="text-primary"
                _placeholder={{ color: 'neutral.400', fontSize: '15px' }}
                _hover={{
                  borderColor: 'neutral.600',
                }}
                _focus={{
                  borderColor: 'primary.400',
                  boxShadow: 'none',
                }}
                height="40px"
                borderRadius="6px"
                maxH="48px"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </Flex>

          {/* Poll Cards */}
          <TabPanels mt={6}>
            <TabPanel p={0}>
              <OngoingPolls
                searchQuery={debouncedSearchQuery}
                upgradeRequired={pollsMetadata?.upgradeRequired}
              />
            </TabPanel>
            <TabPanel p={0}>
              <PastPolls searchQuery={debouncedSearchQuery} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}

export default AllPolls
