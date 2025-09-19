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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FaRegCopy } from 'react-icons/fa'
import { FiEdit3, FiMoreVertical, FiTrash2 } from 'react-icons/fi'

import {
  PollStatus,
  QuickPollParticipantType,
  QuickPollWithParticipants,
} from '@/types/QuickPoll'
import { deleteQuickPoll } from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import { formatPollDateRange, formatPollSingleDate } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

interface PollCardProps {
  poll: QuickPollWithParticipants & {
    host_name?: string
    host_address?: string
    user_participant_type?: QuickPollParticipantType
    user_status?: string
  }
  showActions?: boolean
}

const PollCard = ({ poll, showActions = true }: PollCardProps) => {
  const { showSuccessToast } = useToastHelpers()
  const { push } = useRouter()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Determine if user is host based on participant type
  const isHost =
    poll.user_participant_type === QuickPollParticipantType.SCHEDULER

  // Format dates
  const dateRange = formatPollDateRange(poll.starts_at, poll.ends_at)
  const closingDate = formatPollSingleDate(poll.expires_at)

  // Generate poll link
  const pollLink = `${appUrl}/poll/${poll.slug}`

  // Delete poll mutation
  const deletePollMutation = useMutation({
    mutationFn: () => deleteQuickPoll(poll.id),
    onSuccess: () => {
      showSuccessToast(
        'Poll deleted successfully',
        'The poll has been permanently deleted'
      )
      setIsDeleteModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['quickpolls'] })
    },
    onError: error => {
      handleApiError('Failed to delete poll', error)
    },
  })

  // Determine status display
  const getStatusColor = (status: PollStatus) => {
    switch (status) {
      case PollStatus.ONGOING:
        return { bg: 'green.100', color: 'green.700' }
      case PollStatus.CANCELLED:
        return { bg: 'red.100', color: 'red.400' }
      case PollStatus.COMPLETED:
        return { bg: 'blue.100', color: 'blue.700' }
      default:
        return { bg: 'gray.100', color: 'gray.700' }
    }
  }

  const statusColors = getStatusColor(poll.status)

  const handleDeletePoll = () => {
    deletePollMutation.mutate()
  }

  return (
    <>
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
                  bg={statusColors.bg}
                  color={statusColors.color}
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
                  bg={isHost ? 'orangeButton.300' : 'orange.100'}
                  color={isHost ? 'neutral.0' : 'orange.800'}
                  px="10px"
                  py="5px"
                  borderRadius="10px"
                  fontSize="12.8px"
                  fontWeight="500"
                  textTransform="uppercase"
                >
                  {isHost ? 'HOST' : 'GUEST'}
                </Badge>
              </HStack>

              {/* Action buttons and menu on the right */}
              <HStack spacing={3}>
                {poll.status === PollStatus.ONGOING && isHost && (
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
                        onClick={() => setIsDeleteModalOpen(true)}
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
                {dateRange}
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
                {poll.host_name || 'Unknown'}
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
                {pollLink}
              </Text>
              <IconButton
                icon={<FaRegCopy color="white" size={18} />}
                size="xs"
                variant="ghost"
                color="neutral.0"
                _hover={{ color: 'neutral.200' }}
                aria-label="Copy link"
                onClick={() => {
                  navigator.clipboard.writeText(pollLink)
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
                {closingDate}
              </Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Delete Poll Confirmation Modal */}
      <Modal
        onClose={() => setIsDeleteModalOpen(false)}
        isOpen={isDeleteModalOpen}
        blockScrollOnMount={false}
        size="lg"
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          p="6"
          bg="bg-surface"
          border="1px solid"
          borderColor="neutral.800"
          borderRadius="12px"
          shadow="none"
          boxShadow="none"
        >
          <ModalHeader
            p="0"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Heading size="md" color="neutral.0">
              Delete Poll
            </Heading>
            <ModalCloseButton color="neutral.0" />
          </ModalHeader>
          <ModalBody p="0" mt="6">
            <VStack gap={6}>
              <Text size="base" color="neutral.0">
                Are you sure you want to delete this poll? This action cannot be
                undone. All participants will lose access to this poll and any
                associated data will be permanently removed.
              </Text>
              <HStack ml="auto" w="fit-content" mt="6" gap="4">
                <Button
                  onClick={() => setIsDeleteModalOpen(false)}
                  colorScheme="neutral"
                  isDisabled={deletePollMutation.isLoading}
                  bg="transparent"
                  color="primary.200"
                  _hover={{ bg: 'transparent' }}
                  border="1px solid"
                  borderColor="primary.200"
                >
                  Cancel
                </Button>
                <Button
                  bg="red.600"
                  color="neutral.0"
                  _hover={{ bg: 'red.600' }}
                  isLoading={deletePollMutation.isLoading}
                  loadingText="Deleting poll..."
                  onClick={handleDeletePoll}
                  colorScheme="red"
                  isDisabled={deletePollMutation.isLoading}
                >
                  Delete Poll
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default PollCard
export type { PollCardProps }
