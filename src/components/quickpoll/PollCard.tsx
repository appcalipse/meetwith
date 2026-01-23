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
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useContext, useState } from 'react'
import { FaRegCopy } from 'react-icons/fa'
import { FiEdit3, FiMoreVertical, FiRotateCcw, FiTrash2 } from 'react-icons/fi'

import { MetricStateContext } from '@/providers/MetricStateProvider'
import {
  PollStatus,
  QuickPollParticipantType,
  QuickPollWithParticipants,
  UpdateQuickPollRequest,
} from '@/types/QuickPoll'
import { deleteQuickPoll, updateQuickPoll } from '@/utils/api_helper'
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
  canSchedule?: boolean
}

const PollCard = ({
  poll,
  showActions = true,
  canSchedule = true,
}: PollCardProps) => {
  const { showSuccessToast } = useToastHelpers()
  const { push } = useRouter()
  const { fetchPollCounts } = useContext(MetricStateContext)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)

  // Determine if user is host based on participant type
  const isHost =
    poll.user_participant_type === QuickPollParticipantType.SCHEDULER
  const pollIsExpired = new Date(poll.expires_at) < new Date()

  const isPastPoll =
    poll.status === PollStatus.COMPLETED ||
    poll.status === PollStatus.CANCELLED ||
    poll.status === PollStatus.EXPIRED ||
    pollIsExpired

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
      queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
      void fetchPollCounts()
    },
    onError: error => {
      handleApiError('Failed to delete poll', error)
    },
  })

  // Restore poll mutation
  const restorePollMutation = useMutation({
    mutationFn: () => {
      const now = new Date()
      const fourteenDaysFromNow = new Date(
        now.getTime() + 14 * 24 * 60 * 60 * 1000
      )

      const updateData: UpdateQuickPollRequest = {
        starts_at: now.toISOString(),
        ends_at: fourteenDaysFromNow.toISOString(),
        expires_at: fourteenDaysFromNow.toISOString(),
        status: PollStatus.ONGOING,
      }

      return updateQuickPoll(poll.id, updateData)
    },
    onSuccess: () => {
      showSuccessToast(
        'Poll restored successfully',
        'The poll has been restored and is now active for 14 days'
      )
      setIsRestoreModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
      void fetchPollCounts()
    },
    onError: error => {
      handleApiError('Failed to restore poll', error)
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
      case PollStatus.EXPIRED:
        return { bg: 'orange.100', color: 'orange.700' }
      default:
        return { bg: 'gray.100', color: 'gray.700' }
    }
  }

  const iconColor = useColorModeValue('#181F24', 'white')

  const statusColors = getStatusColor(poll.status)

  const handleDeletePoll = () => {
    deletePollMutation.mutate()
  }

  const handleRestorePoll = () => {
    restorePollMutation.mutate()
  }

  return (
    <>
      <Card
        bg="bg-surface"
        border="1px solid"
        borderColor="card-border"
        borderRadius="12px"
        p={{ base: 4, md: 6 }}
        px={{ base: 4, md: '32px' }}
        position="relative"
        boxShadow="none"
        shadow="none"
      >
        <CardBody p={0}>
          <VStack align="stretch" spacing={{ base: 3, md: 4 }}>
            {/* Header with title, badges, and actions */}
            <Flex
              justify="space-between"
              align={{ base: 'flex-start', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              gap={{ base: 3, md: 0 }}
            >
              <VStack
                align={{ base: 'stretch', md: 'flex-start' }}
                spacing={3}
                flex={1}
                w={{ base: '100%', sm: '100%', md: 'auto' }}
              >
                <Flex justify="space-between" align="center" w="100%">
                  <HStack
                    spacing={3}
                    align="center"
                    flexWrap="wrap"
                    flex={{ base: 1, sm: 1, md: 1 }}
                  >
                    <Heading
                      as="h3"
                      fontSize={{ base: '18px', md: '24px' }}
                      fontWeight="500"
                      color="text-primary"
                      lineHeight="1.2"
                    >
                      {poll.title}
                    </Heading>
                    <HStack spacing={2} flexWrap="wrap">
                      <Badge
                        bg={statusColors.bg}
                        color={statusColors.color}
                        px="10px"
                        py="5px"
                        borderRadius="10px"
                        fontSize={{ base: '11px', md: '12.8px' }}
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
                        fontSize={{ base: '11px', md: '12.8px' }}
                        fontWeight="500"
                        textTransform="uppercase"
                      >
                        {isHost ? 'HOST' : 'GUEST'}
                      </Badge>
                    </HStack>
                  </HStack>

                  {/* Mobile menu button - positioned at the right end of the badges line */}
                  {showActions && isHost && (
                    <Box
                      display={{ base: 'block', md: 'none' }}
                      ml={2}
                      alignSelf="flex-start"
                    >
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical color="white" />}
                          variant="ghost"
                          color="text-tertiary"
                          size="sm"
                          bg="menu-button-hover"
                          _hover={{ bg: 'menu-button-hover' }}
                          _active={{ bg: 'menu-button-hover' }}
                        />
                        <MenuList bg="menu-bg" shadow="none" boxShadow="none">
                          {isPastPoll ? (
                            // Past poll menu items
                            <>
                              <MenuItem
                                icon={<FiRotateCcw size={16} />}
                                bg="menu-bg"
                                color="green.400"
                                _hover={{ bg: 'menu-item-hover' }}
                                onClick={() => setIsRestoreModalOpen(true)}
                              >
                                Restore Poll
                              </MenuItem>
                              <MenuItem
                                icon={<FiTrash2 size={16} />}
                                bg="menu-bg"
                                color="red.300"
                                _hover={{ bg: 'menu-item-hover' }}
                                onClick={() => setIsDeleteModalOpen(true)}
                              >
                                Delete Poll
                              </MenuItem>
                            </>
                          ) : (
                            // Ongoing poll menu items
                            <>
                              <MenuItem
                                icon={<FiEdit3 size={16} />}
                                bg="menu-bg"
                                color="text-primary"
                                _hover={{ bg: 'menu-item-hover' }}
                                onClick={() =>
                                  push(`/dashboard/edit-poll/${poll.slug}`)
                                }
                              >
                                Edit Poll
                              </MenuItem>
                              <MenuItem
                                icon={<FiTrash2 size={16} />}
                                bg="menu-bg"
                                color="red.300"
                                _hover={{ bg: 'menu-item-hover' }}
                                onClick={() => setIsDeleteModalOpen(true)}
                              >
                                Delete Poll
                              </MenuItem>
                            </>
                          )}
                        </MenuList>
                      </Menu>
                    </Box>
                  )}
                </Flex>

                {/* Action buttons - Mobile/Tablet layout */}
                <VStack
                  spacing={2}
                  w="100%"
                  display={{ base: 'flex', md: 'none' }}
                >
                  {/* Mobile: Stacked vertically, Tablet: Side by side */}
                  <Box display={{ base: 'block', sm: 'none' }} w="100%">
                    {poll.status === PollStatus.ONGOING && isHost && (
                      <Button
                        bg="primary.200"
                        color="button-text-dark"
                        size="md"
                        w="100%"
                        py={2.5}
                        fontSize="14px"
                        fontWeight="600"
                        borderRadius="8px"
                        mb={2}
                        _hover={{
                          bg: 'primary.300',
                        }}
                        _active={{
                          bg: 'primary.400',
                        }}
                        isDisabled={!canSchedule}
                        title={
                          !canSchedule
                            ? 'Upgrade to Pro to schedule more polls this month'
                            : undefined
                        }
                        onClick={() =>
                          push(
                            `/dashboard/schedule?ref=quickpoll&pollId=${poll.id}&intent=schedule`
                          )
                        }
                      >
                        Schedule now
                      </Button>
                    )}
                    {!isPastPoll && (
                      <Button
                        variant="outline"
                        borderColor="primary.200"
                        color="primary.200"
                        size="md"
                        w="100%"
                        py={2.5}
                        fontSize="14px"
                        fontWeight="600"
                        borderRadius="8px"
                        onClick={() =>
                          push(
                            `/dashboard/schedule?ref=quickpoll&pollId=${poll.id}&intent=edit_availability`
                          )
                        }
                      >
                        Edit your availability
                      </Button>
                    )}
                  </Box>

                  {/* Tablet: Side by side */}
                  <HStack
                    spacing={2}
                    w="100%"
                    display={{ base: 'none', sm: 'flex', md: 'none' }}
                  >
                    {poll.status === PollStatus.ONGOING && isHost && (
                      <Button
                        bg="primary.200"
                        color="button-text-dark"
                        size="md"
                        w="50%"
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
                        isDisabled={!canSchedule}
                        title={
                          !canSchedule
                            ? 'Upgrade to Pro to schedule more polls this month'
                            : undefined
                        }
                        onClick={() =>
                          push(
                            `/dashboard/schedule?ref=quickpoll&pollId=${poll.id}&intent=schedule`
                          )
                        }
                      >
                        Schedule now
                      </Button>
                    )}
                    {!isPastPoll && (
                      <Button
                        variant="outline"
                        borderColor="primary.200"
                        color="primary.200"
                        size="md"
                        w="50%"
                        py={2.5}
                        fontSize="14px"
                        fontWeight="600"
                        borderRadius="8px"
                        onClick={() =>
                          push(
                            `/dashboard/schedule?ref=quickpoll&pollId=${poll.id}&intent=edit_availability`
                          )
                        }
                      >
                        Edit your availability
                      </Button>
                    )}
                  </HStack>
                </VStack>
              </VStack>

              {/* Action buttons and menu on the right - Desktop layout */}
              <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
                {poll.status === PollStatus.ONGOING && isHost && (
                  <Button
                    bg="primary.200"
                    color="button-text-dark"
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
                    isDisabled={!canSchedule}
                    title={
                      !canSchedule
                        ? 'Upgrade to Pro to schedule more polls this month'
                        : undefined
                    }
                    onClick={() =>
                      push(
                        `/dashboard/schedule?ref=quickpoll&pollId=${poll.id}&intent=schedule`
                      )
                    }
                  >
                    Schedule now
                  </Button>
                )}
                {!isPastPoll && (
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
                      push(
                        `/dashboard/schedule?ref=quickpoll&pollId=${poll.id}&intent=edit_availability`
                      )
                    }
                  >
                    Edit your availability
                  </Button>
                )}

                {/* Action menu */}
                {showActions && isHost && (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical color="white" />}
                      variant="ghost"
                      color="text-tertiary"
                      size="sm"
                      bg="menu-button-hover"
                      _hover={{ bg: 'menu-button-hover' }}
                      _active={{ bg: 'menu-button-hover' }}
                    />
                    <MenuList bg="menu-bg" shadow="none" boxShadow="none">
                      {isPastPoll ? (
                        // Past poll menu items
                        <>
                          <MenuItem
                            icon={<FiRotateCcw size={16} />}
                            bg="menu-bg"
                            color="green.400"
                            _hover={{ bg: 'menu-item-hover' }}
                            onClick={() => setIsRestoreModalOpen(true)}
                          >
                            Restore Poll
                          </MenuItem>
                          <MenuItem
                            icon={<FiTrash2 size={16} />}
                            bg="menu-bg"
                            color="red.300"
                            _hover={{ bg: 'menu-item-hover' }}
                            onClick={() => setIsDeleteModalOpen(true)}
                          >
                            Delete Poll
                          </MenuItem>
                        </>
                      ) : (
                        // Ongoing poll menu items
                        <>
                          <MenuItem
                            icon={<FiEdit3 size={16} />}
                            bg="menu-bg"
                            color="text-primary"
                            _hover={{ bg: 'menu-item-hover' }}
                            onClick={() =>
                              push(`/dashboard/edit-poll/${poll.slug}`)
                            }
                          >
                            Edit Poll
                          </MenuItem>
                          <MenuItem
                            icon={<FiTrash2 size={16} />}
                            bg="menu-bg"
                            color="red.300"
                            _hover={{ bg: 'menu-item-hover' }}
                            onClick={() => setIsDeleteModalOpen(true)}
                          >
                            Delete Poll
                          </MenuItem>
                        </>
                      )}
                    </MenuList>
                  </Menu>
                )}
              </HStack>
            </Flex>

            {/* Meeting date range */}
            <HStack spacing={2} flexWrap="wrap">
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="700"
              >
                Meeting Date Range:
              </Text>
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="500"
              >
                {dateRange}
              </Text>
            </HStack>

            {/* Divider after meeting date range */}
            <Divider borderColor="neutral.600" />

            {/* Host */}
            <HStack spacing={2} flexWrap="wrap">
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="700"
              >
                Host:
              </Text>
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="500"
              >
                {poll.host_name || 'Unknown'}
              </Text>
            </HStack>

            {/* Poll link */}
            <HStack spacing={2} align="center" flexWrap="wrap">
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="700"
              >
                Poll link:
              </Text>
              <HStack spacing={1} align="center" flexWrap="wrap">
                <Text
                  color="orangeButton.300"
                  fontSize={{ base: '14px', md: '16px' }}
                  fontWeight="500"
                  cursor="pointer"
                  _hover={{ textDecoration: 'underline' }}
                  wordBreak="break-all"
                >
                  {pollLink}
                </Text>
                <IconButton
                  icon={<FaRegCopy color={iconColor} size={18} />}
                  size="xs"
                  variant="ghost"
                  color="text-primary"
                  _hover={{ color: 'text-secondary' }}
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
            </HStack>

            {/* Poll closing date */}
            <HStack spacing={2} flexWrap="wrap">
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="700"
              >
                Poll closing date:
              </Text>
              <Text
                fontSize={{ base: '14px', md: '16px' }}
                color="text-primary"
                fontWeight="500"
              >
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
          borderColor="card-border"
          borderRadius={{ base: '0', md: '12px' }}
          height={{ base: '100%', md: 'auto' }}
          shadow="none"
          boxShadow="none"
        >
          <ModalHeader
            p="0"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Heading size="md" color="text-primary">
              Delete Poll
            </Heading>
            <ModalCloseButton color="text-primary" />
          </ModalHeader>
          <ModalBody p="0" mt="6">
            <VStack gap={6}>
              <Text size="base" color="text-primary">
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
                  color="white"
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

      {/* Restore Poll Confirmation Modal */}
      <Modal
        onClose={() => setIsRestoreModalOpen(false)}
        isOpen={isRestoreModalOpen}
        blockScrollOnMount={false}
        size="lg"
        isCentered
      >
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          p="6"
          bg="bg-surface"
          border="1px solid"
          borderColor="card-border"
          borderRadius={{ base: '0', md: '12px' }}
          height={{ base: '100%', md: 'auto' }}
          shadow="none"
          boxShadow="none"
        >
          <ModalHeader
            p="0"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Heading size="md" color="text-primary">
              Restore Poll
            </Heading>
            <ModalCloseButton color="text-primary" />
          </ModalHeader>
          <ModalBody p="0" mt="6">
            <VStack gap={6}>
              <Text size="base" color="text-primary">
                This poll will be restored for poll participation. It will have
                an expiry of 14 days from now, and participants will be able to
                respond to the poll again.
              </Text>
              <HStack ml="auto" w="fit-content" mt="6" gap="4">
                <Button
                  onClick={() => setIsRestoreModalOpen(false)}
                  colorScheme="neutral"
                  isDisabled={restorePollMutation.isLoading}
                  bg="transparent"
                  color="primary.200"
                  _hover={{ bg: 'transparent' }}
                  border="1px solid"
                  borderColor="primary.200"
                >
                  Cancel
                </Button>
                <Button
                  bg="green.600"
                  _hover={{ bg: 'green.600' }}
                  color="white"
                  isLoading={restorePollMutation.isLoading}
                  loadingText="Restoring poll..."
                  onClick={handleRestorePoll}
                  colorScheme="green"
                  isDisabled={restorePollMutation.isLoading}
                >
                  Restore Poll
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
