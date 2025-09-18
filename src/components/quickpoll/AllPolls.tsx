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
import { useRouter } from 'next/router'
import { FiSearch } from 'react-icons/fi'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import PollCard from './PollCard'

const AllPolls = () => {
  const { push } = useRouter()

  // Mock data for demo purposes
  const ongoingPolls = [
    {
      id: 1,
      title: 'DAO Leads WC',
      status: 'ONGOING',
      dateRange: '24th April - 24th June, 2025',
      host: 'Liam Aime',
      pollLink: 'https://meetwith.xyz/poll/memeti-zyof-uin',
      closingDate: '25th May, 2025',
      isHost: true,
    },
    {
      id: 2,
      title: 'DAO Leads WC',
      status: 'ONGOING',
      dateRange: '24th April - 24th June, 2025',
      host: 'Liam Aime',
      pollLink: 'https://meetwith.xyz/poll/memeti-zyof-uin',
      closingDate: '25th May, 2025',
      isHost: true,
    },
    {
      id: 3,
      title: 'DAO Leads WC',
      status: 'ONGOING',
      dateRange: '24th April - 24th June, 2025',
      host: 'Liam Aime',
      pollLink: 'https://meetwith.xyz/poll/memeti-zyof-uin',
      closingDate: '25th May, 2025',
      isHost: false,
    },
  ]

  const pastPolls = [
    {
      id: 4,
      title: 'DAO Leads WC',
      status: 'CANCELLED',
      statusColor: 'orange',
      dateRange: '24th April - 24th June, 2025',
      host: 'Liam Aime',
      pollLink: 'https://meetwith.xyz/poll/memeti-zyof-uin',
      closingDate: '25th May, 2025',
      isHost: false,
    },
    {
      id: 4,
      title: 'DAO Leads WC',
      status: 'CANCELLED',
      statusColor: 'orange',
      dateRange: '24th April - 24th June, 2025',
      host: 'Liam Aime',
      pollLink: 'https://meetwith.xyz/poll/memeti-zyof-uin',
      closingDate: '25th May, 2025',
      isHost: true,
    },
  ]

  return (
    <Box width="100%" bg="neutral.850" minHeight="100vh" px={6} py={8}>
      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">
        {/* Header Section */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading as="h1" fontSize="24px" fontWeight="700" color="neutral.0">
              Quick Poll for Groups
            </Heading>
            <Text fontSize="16px" color="neutral.400" fontWeight="500">
              Coordinate availability across teams without the email chains
            </Text>
          </VStack>

          <Button
            leftIcon={<HiMiniPlusCircle size={20} color="#323F4B" />}
            bg="primary.200"
            color="neutral.900"
            px={5}
            py={2.5}
            fontSize="15px"
            fontWeight="600"
            borderRadius="8px"
            _hover={{
              bg: 'primary.300',
            }}
            _active={{
              bg: 'primary.400',
            }}
            onClick={() => push('/dashboard/create-poll')}
          >
            Run new poll
          </Button>
        </Flex>

        {/* Tabs with Search Section */}
        <Tabs variant="unstyled" defaultIndex={0}>
          <Flex justify="space-between" align="center">
            {/* Tabs */}
            <TabList
              bg="bg-surface-secondary"
              p={1}
              borderWidth={1}
              borderColor="neutral.400"
              rounded={6}
              width="fit-content"
            >
              <Tab
                rounded={4}
                px={4}
                py={2}
                fontWeight={600}
                fontSize="14px"
                color="neutral.0"
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Ongoing Polls
              </Tab>
              <Tab
                rounded={4}
                px={4}
                py={2}
                fontWeight={600}
                fontSize="14px"
                color="neutral.0"
                _selected={{
                  color: 'neutral.900',
                  bg: 'primary.200',
                }}
              >
                Past Polls
              </Tab>
            </TabList>

            {/* Search Input */}
            <InputGroup maxW="275px" maxH="48px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="neutral.500" />
              </InputLeftElement>
              <Input
                placeholder="Search for Poll"
                bg="bg-surface-secondary"
                border="1px solid"
                borderColor="neutral.400"
                color="neutral.200"
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
              />
            </InputGroup>
          </Flex>

          {/* Poll Cards */}
          <TabPanels mt={6}>
            <TabPanel p={0}>
              <VStack spacing={4} align="stretch">
                {ongoingPolls.map(poll => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </VStack>
            </TabPanel>
            <TabPanel p={0}>
              <VStack spacing={4} align="stretch">
                {pastPolls.map(poll => (
                  <PollCard key={poll.id} poll={poll} showActions={false} />
                ))}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}

export default AllPolls
