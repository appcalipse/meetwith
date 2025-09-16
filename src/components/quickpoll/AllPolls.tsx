import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { FaRegCopy } from 'react-icons/fa'
import { FiEdit3, FiMoreVertical, FiSearch, FiTrash2 } from 'react-icons/fi'
import { HiMiniPlusCircle } from 'react-icons/hi2'

import { useToastHelpers } from '@/utils/toasts'

const AllPolls = () => {
  const { showSuccessToast } = useToastHelpers()
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

  const PollCard = ({
    poll,
    showActions = true,
  }: {
    poll: any
    showActions?: boolean
  }) => (
    <Card
      bg="neutral.900"
      border="1px solid"
      borderColor="neutral.800"
      borderRadius="12px"
      p={6}
      px="32px"
      position="relative"
    >
      <CardBody p={0}>
        <VStack align="stretch" spacing={4}>
          {/* Header with title, badges, and actions */}
          <Flex justify="space-between" align="center">
            <HStack spacing={3} align="center">
              <Heading
                as="h3"
                fontSize="24px"
                fontWeight="500"
                color="neutral.0"
              >
                {poll.title}
              </Heading>
              <Badge
                bg={poll.status === 'ONGOING' ? 'green.100' : 'orange.100'}
                color={poll.status === 'ONGOING' ? 'green.700' : 'orange.800'}
                px="10px"
                py="5px"
                borderRadius="10px"
                fontSize="12.8px"
                fontWeight="500"
                textTransform="uppercase"
              >
                {poll.status}
              </Badge>

              <Badge
                bg={poll.isHost ? 'orangeButton.300' : 'orange.100'}
                color={poll.isHost ? 'neutral.0' : 'orange.800'}
                px="10px"
                py="5px"
                borderRadius="10px"
                fontSize="12.8px"
                fontWeight="500"
                textTransform="uppercase"
              >
                {poll.isHost ? 'HOST' : 'GUEST'}
              </Badge>
            </HStack>

            {/* Action buttons and menu on the right */}
            <HStack spacing={3}>
              {poll.status === 'ONGOING' && (
                <Button
                  bg="primary.200"
                  color="neutral.900"
                  size="md"
                  px={5}
                  py={2.5}
                  fontSize="14px"
                  fontWeight="600"
                  borderRadius="8px"
                  _hover={{
                    bg: 'primary.300',
                  }}
                  _active={{
                    bg: 'primary.400',
                  }}
                >
                  Schedule now
                </Button>
              )}
              <Button
                variant="outline"
                borderColor="primary.200"
                color="primary.200"
                size="md"
                px={5}
                py={2.5}
                fontSize="14px"
                fontWeight="600"
                borderRadius="8px"
                _hover={{
                  bg: 'neutral.800',
                  borderColor: 'neutral.600',
                }}
                _active={{
                  bg: 'neutral.700',
                }}
              >
                Edit your availability
              </Button>

              {/* Action menu */}
              {showActions && (
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical color="white" />}
                    variant="ghost"
                    color="neutral.400"
                    size="sm"
                    bg="neutral.800"
                    _hover={{ bg: 'neutral.800' }}
                    _active={{ bg: 'neutral.700' }}
                  />
                  <MenuList bg="neutral.800" shadow="none" boxShadow="none">
                    <MenuItem
                      icon={<FiEdit3 size={16} />}
                      bg="neutral.800"
                      color="neutral.0"
                      _hover={{ bg: 'neutral.700' }}
                    >
                      Edit Poll
                    </MenuItem>
                    <MenuItem
                      icon={<FiTrash2 size={16} />}
                      bg="neutral.800"
                      color="red.500"
                      _hover={{ bg: 'neutral.700' }}
                    >
                      Delete Poll
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </Flex>

          {/* Meeting date range */}
          <HStack spacing={2}>
            <Text fontSize="16px" color="neutral.0" fontWeight="700">
              Meeting Date Range:
            </Text>
            <Text fontSize="16px" color="neutral.0" fontWeight="500">
              {poll.dateRange}
            </Text>
          </HStack>

          {/* Divider after meeting date range */}
          <Divider borderColor="neutral.600" />

          {/* Host */}
          <HStack spacing={2}>
            <Text fontSize="16px" color="neutral.0" fontWeight="700">
              Host:
            </Text>
            <Text fontSize="16px" color="neutral.0" fontWeight="500">
              {poll.host}
            </Text>
          </HStack>

          {/* Poll link */}
          <HStack spacing={2} align="center">
            <Text fontSize="16px" color="neutral.0" fontWeight="700">
              Poll link:
            </Text>
            <Text
              color="orangeButton.300"
              fontSize="16px"
              fontWeight="500"
              cursor="pointer"
              _hover={{ textDecoration: 'underline' }}
            >
              {poll.pollLink}
            </Text>
            <IconButton
              icon={<FaRegCopy color="white" size={18} />}
              size="xs"
              variant="ghost"
              color="neutral.0"
              _hover={{ color: 'neutral.200' }}
              aria-label="Copy link"
              onClick={() => {
                navigator.clipboard.writeText(poll.pollLink)
                showSuccessToast(
                  'Link copied!',
                  'Poll link has been copied to clipboard'
                )
              }}
            />
          </HStack>

          {/* Poll closing date */}
          <HStack spacing={2}>
            <Text fontSize="16px" color="neutral.0" fontWeight="700">
              Poll closing date:
            </Text>
            <Text fontSize="16px" color="neutral.0" fontWeight="500">
              {poll.closingDate}
            </Text>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )

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
