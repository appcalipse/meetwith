import {
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { FaRegCopy } from 'react-icons/fa'
import { FiEdit3, FiMoreVertical, FiTrash2 } from 'react-icons/fi'

import { useToastHelpers } from '@/utils/toasts'

interface Poll {
  id: number
  title: string
  status: string
  dateRange: string
  host: string
  pollLink: string
  closingDate: string
  isHost: boolean
}

interface PollCardProps {
  poll: Poll
  showActions?: boolean
}

const PollCard = ({ poll, showActions = true }: PollCardProps) => {
  const { showSuccessToast } = useToastHelpers()
  const { push } = useRouter()

  return (
    <Card
      bg="bg-surface"
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
                bg={poll.status === 'ONGOING' ? 'green.100' : 'red.100'}
                color={poll.status === 'ONGOING' ? 'green.700' : 'red.400'}
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
                onClick={() =>
                  push(`/dashboard/schedule?ref=quickpoll&pollId=${poll.id}`)
                }
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
}

export default PollCard
export type { Poll, PollCardProps }
