import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
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
  Select,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { FaArrowLeft, FaChevronDown } from 'react-icons/fa'
import { FiArrowLeft } from 'react-icons/fi'
import { HiOutlineUserAdd } from 'react-icons/hi'
import CustomError from '@/components/CustomError'
import CustomLoading from '@/components/CustomLoading'
import { ChipInput } from '@/components/chip-input'
import { BadgeChip } from '@/components/chip-input/chip'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import InfoTooltip from '@/components/profile/components/Tooltip'
import InviteParticipants from '@/components/schedule/participants/InviteParticipants'
import { AccountContext } from '@/providers/AccountProvider'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  AddParticipantData,
  CreatePollProps,
  CreateQuickPollRequest,
  QuickPollBySlugResponse,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
  UpdateQuickPollRequest,
} from '@/types/QuickPoll'
import { isGroupParticipant } from '@/types/schedule'
import {
  cancelQuickPoll,
  createQuickPoll,
  getQuickPollBySlug,
  updateQuickPoll,
} from '@/utils/api_helper'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import {
  DEFAULT_GROUP_SCHEDULING_DURATION,
  MeetingPermissions,
  QuickPollPermissionsList,
} from '@/utils/constants/schedule'
import { createLocalDate, createLocalDateTime } from '@/utils/date_helper'
import { handleApiError } from '@/utils/error_helper'
import {
  clearValidationError,
  deduplicateArray,
  isAccountSchedulerOrOwner,
} from '@/utils/generic_utils'
import { queryClient } from '@/utils/react_query'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { quickPollSchema } from '@/utils/schemas'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

const mapQuickPollStatus = (
  status: QuickPollParticipantStatus
): ParticipationStatus => {
  switch (status) {
    case QuickPollParticipantStatus.PENDING:
      return ParticipationStatus.Pending
    case QuickPollParticipantStatus.ACCEPTED:
      return ParticipationStatus.Accepted
    case QuickPollParticipantStatus.DECLINED:
      return ParticipationStatus.Rejected
    default:
      return ParticipationStatus.Pending
  }
}

const mapQuickPollType = (type: QuickPollParticipantType): ParticipantType => {
  switch (type) {
    case QuickPollParticipantType.SCHEDULER:
      return ParticipantType.Scheduler
    case QuickPollParticipantType.INVITEE:
      return ParticipantType.Invitee
    case QuickPollParticipantType.OWNER:
      return ParticipantType.Owner
    default:
      return ParticipantType.Invitee
  }
}

const CreatePoll = ({ isEditMode = false, pollSlug }: CreatePollProps) => {
  const { push } = useRouter()
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  const {
    isOpen: isInviteModalOpen,
    onOpen: openInviteModal,
    onClose: closeInviteModal,
  } = useDisclosure()

  const {
    isOpen: isCancelModalOpen,
    onOpen: openCancelModal,
    onClose: closeCancelModal,
  } = useDisclosure()

  const {
    participants,
    setParticipants,
    groupAvailability,
    setGroupAvailability,
    groupParticipants,
    setGroupParticipants,
    groups: allGroups,
  } = useParticipants()
  const inviteKey = useMemo(
    () =>
      `${Object.values(groupAvailability).flat().length}-${
        Object.values(groupParticipants).flat().length
      }-${participants.length}`,
    [groupAvailability, groupParticipants, participants]
  )
  const { currentAccount } = useContext(AccountContext)
  const { fetchPollCounts } = useContext(MetricStateContext)

  const [formData, setFormData] = useState({
    title: '',
    duration: 30,
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    expiryTime: new Date(),
    description: '',
  })

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    MeetingPermissions.SCHEDULE_MEETING,
    MeetingPermissions.SEE_GUEST_LIST,
  ])
  const [removeExpiryDate, setRemoveExpiryDate] = useState(false)

  // Get all participants
  const allMergedParticipants = useMemo(() => {
    const merged = getMergedParticipants(
      participants,
      allGroups,
      groupParticipants,
      currentAccount?.address
    )

    const processedKeys = new Set<string>()
    const deduplicatedParticipants = merged.filter(participant => {
      const key =
        participant.account_address?.toLowerCase() ||
        participant.guest_email?.toLowerCase()
      if (!key || processedKeys.has(key)) return false
      processedKeys.add(key)
      return true
    })

    return deduplicatedParticipants
  }, [participants, allGroups, groupParticipants, currentAccount?.address])

  useEffect(() => {
    const needsUpdate = participants.some(participant => {
      if (isGroupParticipant(participant)) {
        return false
      }
      const participantInfo = participant as ParticipantInfo
      const isSchedulerOrOwner = isAccountSchedulerOrOwner(
        [participantInfo],
        participantInfo.account_address
      )
      if (isSchedulerOrOwner) {
        return participantInfo.isHidden !== true
      }
      return participantInfo.isHidden === true
    })

    if (!needsUpdate) return

    setParticipants(prev =>
      prev.map(participant => {
        if (isGroupParticipant(participant)) {
          return participant
        }
        const participantInfo = participant as ParticipantInfo
        const isSchedulerOrOwner = isAccountSchedulerOrOwner(
          [participantInfo],
          participantInfo.account_address
        )
        if (isSchedulerOrOwner) {
          return participantInfo.isHidden === true
            ? participantInfo
            : { ...participantInfo, isHidden: true }
        }
        return participantInfo.isHidden === true
          ? { ...participantInfo, isHidden: false }
          : participantInfo
      })
    )
  }, [participants, setParticipants])

  useEffect(() => {
    if (allMergedParticipants.length > 0 && validationErrors.participants) {
      setValidationErrors(prev => {
        const { participants, ...rest } = prev
        return rest
      })
    }
  }, [allMergedParticipants.length, validationErrors.participants])

  const router = useRouter()
  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const iconColor = useColorModeValue('#181F24', 'white')

  // Fetch poll data when in edit mode
  const {
    data: pollData,
    isLoading: isPollLoading,
    error,
  } = useQuery(['quickpoll', pollSlug], () => getQuickPollBySlug(pollSlug!), {
    enabled: isEditMode && !!pollSlug,
    onError: error => {
      handleApiError('Failed to fetch poll data', error)
    },
  })

  const [originalParticipants, setOriginalParticipants] = useState<
    Array<{ id: string; account_address?: string; guest_email: string }>
  >([])

  useEffect(() => {
    if (isEditMode && pollData && !isPollLoading) {
      const pollResponse = pollData as QuickPollBySlugResponse
      const poll = pollResponse.poll

      const hasExpiry = !!poll.expires_at
      setRemoveExpiryDate(!hasExpiry)

      // Set form data
      const defaultExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      setFormData({
        title: poll.title,
        duration: poll.duration_minutes,
        startDate: new Date(poll.starts_at),
        endDate: new Date(poll.ends_at),
        expiryDate:
          hasExpiry && poll.expires_at !== null
            ? new Date(poll.expires_at)
            : defaultExpiryDate,
        expiryTime:
          hasExpiry && poll.expires_at !== null
            ? new Date(poll.expires_at)
            : new Date(),
        description: poll.description || '',
      })

      // Set permissions
      setSelectedPermissions(poll.permissions || [])

      const originalParticipantsData =
        poll.participants
          ?.filter(
            p => p.participant_type !== QuickPollParticipantType.SCHEDULER
          )
          .map(p => ({
            id: p.id,
            account_address: p.account_address,
            guest_email: p.guest_email,
          })) || []

      setOriginalParticipants(originalParticipantsData)

      // Convert poll participants to ParticipantInfo format and set them
      const participantInfos =
        poll.participants
          ?.filter(
            p => p.participant_type !== QuickPollParticipantType.SCHEDULER
          ) // Exclude the scheduler/host
          .map(participant => ({
            account_address: participant.account_address,
            name: participant.guest_name,
            guest_email: participant.guest_email,
            status: mapQuickPollStatus(participant.status),
            meeting_id: '',
            type: mapQuickPollType(participant.participant_type),
            isHidden: true,
          })) || []

      setParticipants(participantInfos)

      // Set group availability and participants for non-group participants
      const addressesToAdd = participantInfos
        .map(p => p.account_address)
        .filter((a): a is string => !!a)

      if (addressesToAdd.length > 0) {
        setGroupAvailability(prev => ({
          ...prev,
          [NO_GROUP_KEY]: deduplicateArray([
            ...(prev[NO_GROUP_KEY] || []),
            ...addressesToAdd,
          ]),
        }))

        setGroupParticipants(prev => ({
          ...prev,
          [NO_GROUP_KEY]: deduplicateArray([
            ...(prev[NO_GROUP_KEY] || []),
            ...addressesToAdd,
          ]),
        }))
      }
    }
  }, [
    isEditMode,
    pollData,
    isPollLoading,
    setParticipants,
    setGroupAvailability,
    setGroupParticipants,
  ])

  const createPollMutation = useMutation({
    mutationFn: (pollData: CreateQuickPollRequest) => createQuickPoll(pollData),
    onSuccess: response => {
      showSuccessToast(
        'Poll Created Successfully!',
        'Your quick poll has been created and is ready to share with participants.'
      )
      queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['quickpolls-check'] })
      void fetchPollCounts()

      // Reset form state
      setFormData({
        title: '',
        duration: 30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expiryTime: new Date(),
        description: '',
      })
      setSelectedPermissions([
        MeetingPermissions.SEE_GUEST_LIST,
        MeetingPermissions.SCHEDULE_MEETING,
      ])
      setRemoveExpiryDate(false)
      setParticipants([])
      setGroupAvailability({})
      setGroupParticipants({})

      const pollId = (response as { poll?: { id?: string } })?.poll?.id
      if (pollId) {
        router.push(
          `/dashboard/schedule?ref=quickpoll&pollId=${pollId}&intent=edit_availability`
        )
      }
    },
    onError: error => {
      handleApiError('Failed to create poll', error)
    },
  })

  const updatePollMutation = useMutation({
    mutationFn: (updates: UpdateQuickPollRequest) => {
      if (!pollData) throw new Error('Poll data not available')
      const pollResponse = pollData as QuickPollBySlugResponse
      return updateQuickPoll(pollResponse.poll.id, updates)
    },
    onSuccess: () => {
      showSuccessToast(
        'Poll Updated Successfully!',
        'Your quick poll has been updated with the new details.'
      )
      queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['quickpoll', pollSlug] })
      queryClient.invalidateQueries({ queryKey: ['quickpolls-check'] })
      void fetchPollCounts()
      router.push('/dashboard/quickpoll')
    },
    onError: error => {
      handleApiError('Failed to update poll', error)
    },
  })

  const cancelPollMutation = useMutation({
    mutationFn: () => {
      if (!pollData) throw new Error('Poll data not available')
      const pollResponse = pollData as QuickPollBySlugResponse
      return cancelQuickPoll(pollResponse.poll.id)
    },
    onSuccess: () => {
      showSuccessToast(
        'Poll Cancelled Successfully',
        'The poll has been cancelled.'
      )
      queryClient.invalidateQueries({ queryKey: ['ongoing-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['past-quickpolls'] })
      queryClient.invalidateQueries({ queryKey: ['quickpolls-check'] })
      void fetchPollCounts()
      closeCancelModal()
      router.push('/dashboard/quickpoll')
    },
    onError: error => {
      handleApiError('Failed to cancel poll', error)
    },
  })

  const handleSubmit = () => {
    setValidationErrors({})

    const validationData = {
      ...formData,
      participants: allMergedParticipants,
      removeExpiryDate,
    }

    const validationResult = quickPollSchema.safeParse(validationData)

    if (!validationResult.success) {
      const errors: Record<string, string> = {}
      let hasExpiryError = false

      validationResult.error.errors.forEach(error => {
        const field = error.path.join('.')
        errors[field] = error.message

        if (field === 'expiryDate' && error.message.includes('future')) {
          hasExpiryError = true
        }
      })
      setValidationErrors(errors)

      if (hasExpiryError) {
        showErrorToast(
          'Invalid Expiry Time',
          'The poll expiry time must be in the future. Please select a later date and time.'
        )
      }
      return
    }

    if (isEditMode) {
      const participantChanges = calculateParticipantChanges()

      const updateData: UpdateQuickPollRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        duration_minutes: formData.duration,
        starts_at: createLocalDate(formData.startDate),
        ends_at: createLocalDate(formData.endDate),
        expires_at: removeExpiryDate
          ? null
          : createLocalDateTime(formData.expiryDate, formData.expiryTime),
        permissions: selectedPermissions as MeetingPermissions[],
        participants:
          participantChanges.toAdd.length > 0 ||
          participantChanges.toRemove.length > 0
            ? participantChanges
            : undefined, // Only include participants if there are changes
      }

      updatePollMutation.mutate(updateData)
    } else {
      // Create mode - prepare create request
      const pollData: CreateQuickPollRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        duration_minutes: formData.duration,
        starts_at: createLocalDate(formData.startDate),
        ends_at: createLocalDate(formData.endDate),
        expires_at: removeExpiryDate
          ? null
          : createLocalDateTime(formData.expiryDate, formData.expiryTime),
        permissions: selectedPermissions as MeetingPermissions[],
        participants:
          allMergedParticipants.length > 0
            ? allMergedParticipants.map(p => ({
                account_address: p.account_address,
                name: p.name,
                guest_email: p.guest_email,
                participant_type: QuickPollParticipantType.INVITEE,
              }))
            : [],
      }

      createPollMutation.mutate(pollData)
    }
  }

  const handleCancelPoll = () => {
    cancelPollMutation.mutate()
  }

  const handleBackToPolls = () => {
    router.push('/dashboard/quickpoll')
  }

  const handleBackToPollsFromHeader = () => {
    push('/dashboard/quickpoll')
  }

  // Function to calculate participant changes for update mode
  const calculateParticipantChanges = (): {
    toAdd: AddParticipantData[]
    toRemove: string[]
  } => {
    if (!isEditMode) return { toAdd: [], toRemove: [] }

    // Current participants
    const currentParticipants = allMergedParticipants

    // new participants not in original list
    const toAdd = currentParticipants.filter(current => {
      // Check if this participant was in the original list
      const existsInOriginal = originalParticipants.some(original => {
        // Match by account_address if available, otherwise by guest_email
        if (current.account_address && original.account_address) {
          return (
            current.account_address.toLowerCase() ===
            original.account_address.toLowerCase()
          )
        }
        // For guests without account_address, match by email
        return current.guest_email === original.guest_email
      })
      return !existsInOriginal
    })

    // original participants not in current list
    const toRemove = originalParticipants
      .filter(original => {
        // Check if this original participant is still in the current list
        const existsInCurrent = currentParticipants.some(current => {
          // Match by account_address if available, otherwise by guest_email
          if (current.account_address && original.account_address) {
            return (
              current.account_address.toLowerCase() ===
              original.account_address.toLowerCase()
            )
          }
          // For guests without account_address, match by email
          return current.guest_email === original.guest_email
        })
        return !existsInCurrent
      })
      .map(p => p.id) // Return participant IDs for removal

    return {
      toAdd: toAdd.map(p => ({
        account_address: p.account_address,
        guest_name: p.name,
        guest_email: p.guest_email || '',
        participant_type: QuickPollParticipantType.INVITEE,
      })),
      toRemove,
    }
  }

  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const normalizedParticipants = _participants.map(participant => ({
        ...participant,
        isHidden: false,
      }))

      const currentMerged = allMergedParticipants
      const isRemoval = _participants.length < currentMerged.length

      if (isRemoval) {
        // Simply update participants to match the new list from ChipInput
        React.startTransition(() => {
          setParticipants(prev => {
            const groupParticipants = prev.filter(user =>
              isGroupParticipant(user)
            )
            return [...groupParticipants, ...normalizedParticipants]
          })
        })

        // Handle group participant removal
        const removedAddresses = currentMerged
          .filter(
            current =>
              !_participants.some(
                newP =>
                  current.account_address &&
                  newP.account_address &&
                  current.account_address.toLowerCase() ===
                    newP.account_address.toLowerCase()
              )
          )
          .map(p => p.account_address?.toLowerCase())
          .filter((a): a is string => !!a)

        if (removedAddresses.length > 0) {
          const keys = Object.keys(groupAvailability)
          for (const key of keys) {
            setGroupParticipants(prev => {
              const allGroupParticipants = prev[key] || []
              const newParticipants = allGroupParticipants.filter(
                val => !removedAddresses.includes(val.toLowerCase())
              )
              return {
                ...prev,
                [key]: newParticipants,
              }
            })

            setGroupAvailability(prev => {
              const allGroupAvailability = prev[key] || []
              const newAvailability = allGroupAvailability.filter(
                val => !removedAddresses.includes(val.toLowerCase())
              )
              return {
                ...prev,
                [key]: newAvailability,
              }
            })
          }
        }
      } else {
        const addressesToAdd = _participants
          .map(p => p.account_address)
          .filter((a): a is string => !!a)

        React.startTransition(() => {
          setParticipants(prevUsers => {
            const groupParticipants = prevUsers.filter(user =>
              isGroupParticipant(user)
            )
            return [...groupParticipants, ...normalizedParticipants]
          })

          if (addressesToAdd.length > 0) {
            setGroupAvailability(prev => ({
              ...prev,
              [NO_GROUP_KEY]: deduplicateArray([
                ...(prev[NO_GROUP_KEY] || []),
                ...addressesToAdd,
              ]),
            }))

            setGroupParticipants(prev => ({
              ...prev,
              [NO_GROUP_KEY]: deduplicateArray([
                ...(prev[NO_GROUP_KEY] || []),
                ...addressesToAdd,
              ]),
            }))
          }
        })
      }

      // Clear participants validation error when participants are added
      if (_participants.length > 0 && validationErrors.participants) {
        setValidationErrors(prev => {
          const { participants, ...rest } = prev
          return rest
        })
      }
    },
    [
      setParticipants,
      setGroupAvailability,
      setGroupParticipants,
      allMergedParticipants,
      validationErrors,
    ]
  )

  // Show loading when fetching poll data in edit mode
  if (isEditMode && isPollLoading) {
    return (
      <Box
        width="100%"
        minHeight="100vh"
        bg="bg-canvas"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CustomLoading text="Loading poll data..." />
      </Box>
    )
  }

  // Show error state if there's an error fetching poll data in edit mode
  if (isEditMode && error) {
    return (
      <Box width="100%" minHeight="100vh" bg="bg-canvas" px={6} py={8}>
        <Flex justify="center" align="center" minH="100vh">
          <Box maxW="500px" w="100%">
            <CustomError
              title="Failed to load poll"
              description="We couldn't load this poll. It may have been deleted or you may not have permission to view it."
              imageSrc="/assets/404.svg"
              imageAlt="Poll not found"
            />
            <Flex justify="center" mt={6}>
              <Button
                leftIcon={<FiArrowLeft size={16} />}
                variant="outline"
                borderColor="primary.200"
                color="primary.200"
                size="md"
                px={5}
                py={2.5}
                fontSize="14px"
                fontWeight="600"
                borderRadius="8px"
                onClick={handleBackToPolls}
              >
                Back to Polls
              </Button>
            </Flex>
          </Box>
        </Flex>
      </Box>
    )
  }

  const isLoading =
    createPollMutation.isLoading ||
    updatePollMutation.isLoading ||
    cancelPollMutation.isLoading

  const handleRemovePermission = useCallback(
    (permissionValue: string) => {
      if (!isLoading) {
        setSelectedPermissions(
          prev => prev?.filter(p => p !== permissionValue) || []
        )
      }
    },
    [isLoading]
  )

  const handleTogglePermission = useCallback(
    (permissionValue: string) => {
      const isSelected = selectedPermissions?.includes(permissionValue)
      if (isSelected) {
        setSelectedPermissions(
          prev => prev?.filter(p => p !== permissionValue) || []
        )
      } else {
        setSelectedPermissions(prev => (prev || []).concat(permissionValue))
      }
    },
    [selectedPermissions]
  )

  return (
    <Box
      width="100%"
      minHeight="100vh"
      bg="bg-canvas"
      px={{ base: 4, md: 8 }}
      py={{ base: 32, md: 8 }}
      display="flex"
      justifyContent="center"
    >
      <VStack spacing={8} align="stretch" maxW="450px" width="100%">
        {/* Header with Back Button */}
        <VStack spacing={4} align="flex-start">
          <HStack
            color="primary.400"
            cursor="pointer"
            onClick={handleBackToPollsFromHeader}
            _hover={{ color: 'primary.500' }}
          >
            <Icon as={FaArrowLeft} />
            <Text fontWeight="medium">Back</Text>
          </HStack>

          <Heading
            as="h1"
            fontSize="x-large"
            fontWeight="bold"
            color="text-primary"
            textAlign="left"
            width="100%"
          >
            {isEditMode ? 'Edit Poll' : 'Create Poll'}
          </Heading>
        </VStack>

        {/* Form */}
        <VStack spacing={6} align="stretch">
          {/* Meeting Date Range */}
          <FormControl>
            <FormLabel htmlFor="date">
              Meeting Date options (From → To)
            </FormLabel>
            <HStack w={'100%'} gap={4}>
              <SingleDatepicker
                date={formData.startDate}
                onDateChange={date =>
                  setFormData(prev => ({ ...prev, startDate: date }))
                }
                blockPast={true}
                inputProps={{
                  height: 'auto',
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  _placeholder: {
                    color: 'neutral.400',
                  },
                }}
                iconColor="neutral.400"
                iconSize={20}
                disabled={isLoading}
              />
              <SingleDatepicker
                date={formData.endDate}
                onDateChange={date =>
                  setFormData(prev => ({ ...prev, endDate: date }))
                }
                blockPast={true}
                inputProps={{
                  height: 'auto',
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  _placeholder: {
                    color: 'neutral.400',
                  },
                }}
                iconColor="neutral.400"
                iconSize={20}
                disabled={isLoading}
              />
            </HStack>
          </FormControl>

          {/* Title and Duration - Same Line */}
          <HStack spacing={4} align="start">
            <FormControl isInvalid={!!validationErrors.title} flex={3}>
              <FormLabel
                _invalid={{
                  color: 'red.500',
                }}
              >
                Title
                <Text color="red.500" display="inline">
                  *
                </Text>
              </FormLabel>
              <Input
                placeholder="Enter meeting title"
                _placeholder={{
                  color: 'neutral.400',
                }}
                borderColor="neutral.400"
                value={formData.title}
                onChange={e => {
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }}
                onBlur={clearValidationError(setValidationErrors, 'title')}
                errorBorderColor="red.500"
                isInvalid={!!validationErrors.title}
                isDisabled={isLoading}
              />
              <Box minH="20px">
                {validationErrors.title && (
                  <FormHelperText color="red.500" mt={1}>
                    {validationErrors.title}
                  </FormHelperText>
                )}
              </Box>
            </FormControl>

            <FormControl
              w={'max-content'}
              isInvalid={!!validationErrors.duration}
              flex={1}
            >
              <FormLabel htmlFor="duration">
                Duration
                <Text color="red.500" display="inline">
                  *
                </Text>
              </FormLabel>
              <Select
                id="duration"
                placeholder="Duration"
                onChange={e => {
                  setFormData(prev => ({
                    ...prev,
                    duration: Number(e.target.value),
                  }))
                }}
                onBlur={clearValidationError(setValidationErrors, 'duration')}
                value={formData.duration}
                borderColor="neutral.400"
                width={'max-content'}
                maxW="350px"
                isInvalid={!!validationErrors.duration}
                errorBorderColor="red.500"
                isDisabled={isLoading}
              >
                {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
                  <option key={type.id} value={type.duration}>
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
              </Select>
              <Box minH="20px">
                {validationErrors.duration && (
                  <FormHelperText color="red.500" mt={1}>
                    {validationErrors.duration}
                  </FormHelperText>
                )}
              </Box>
            </FormControl>
          </HStack>

          {/* Add Guest from Groups */}
          <FormControl w="100%" maxW="100%" mt={-2}>
            <FormLabel htmlFor="participants">
              Add Participants to the meeting{' '}
              <InfoTooltip text="Add participants from groups, contacts, or enter manually" />
            </FormLabel>
            <Box w="100%" maxW="100%">
              <ChipInput
                currentItems={allMergedParticipants}
                placeholder="Add participants"
                onChange={onParticipantsChange}
                renderItem={p => {
                  if (p.account_address) {
                    return p.name || ellipsizeAddress(p.account_address!)
                  } else if (p.name && p.guest_email) {
                    return `${p.name} - ${p.guest_email}`
                  } else if (p.name) {
                    return `${p.name}`
                  } else {
                    return p.guest_email!
                  }
                }}
                inputProps={{
                  pr: 180,
                  isInvalid: !!validationErrors.participants,
                  errorBorderColor: 'red.500',
                  isDisabled: isLoading,
                }}
                button={
                  <Button
                    pos="absolute"
                    insetY={0}
                    right={0}
                    alignItems="center"
                    onClick={openInviteModal}
                    variant={'link'}
                    _hover={{
                      textDecoration: 'none',
                    }}
                    isDisabled={isLoading}
                  >
                    <HiOutlineUserAdd color={iconColor} size={20} />
                  </Button>
                }
              />
            </Box>
            <FormHelperText minW={{ md: '600px' }}>
              {validationErrors.participants && (
                <Text color="red.500">{validationErrors.participants}</Text>
              )}
            </FormHelperText>
          </FormControl>

          {/* Description */}
          <FormControl>
            <FormLabel htmlFor="info">Description (optional)</FormLabel>
            <Textarea
              placeholder="Any information you want to share prior to the meeting?"
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              bg="bg-canvas"
              border="1px solid"
              borderColor="neutral.400"
              color="text-primary"
              _placeholder={{ color: 'neutral.400' }}
              rows={4}
              isDisabled={isLoading}
            />
          </FormControl>

          {/* Poll Expiry Date */}
          <FormControl>
            <FormLabel htmlFor="expiry-date">Poll Expiry Date</FormLabel>
            <HStack w={'100%'} gap={4}>
              <SingleDatepicker
                date={formData.expiryDate}
                onDateChange={date =>
                  setFormData(prev => ({ ...prev, expiryDate: date }))
                }
                blockPast={true}
                inputProps={{
                  height: 'auto',
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  _placeholder: {
                    color: 'neutral.400',
                  },
                }}
                iconColor="neutral.400"
                iconSize={20}
                disabled={isLoading || removeExpiryDate}
              />
              <InputTimePicker
                value={format(formData.expiryTime, 'p')}
                onChange={time =>
                  setFormData(prev => ({ ...prev, expiryTime: new Date(time) }))
                }
                currentDate={formData.expiryDate}
                inputProps={{
                  height: 'auto',
                  py: 3,
                  pl: 12,
                  borderColor: 'neutral.400',
                  _placeholder: {
                    color: 'neutral.400',
                  },
                  isDisabled: isLoading || removeExpiryDate,
                }}
                iconColor="neutral.400"
                iconSize={20}
              />
            </HStack>
            <HStack w="100%" justifyContent="space-between" mt={2}>
              <Text fontSize="sm" color="text-primary">
                Remove expiry date
              </Text>
              <Checkbox
                isChecked={removeExpiryDate}
                onChange={e => setRemoveExpiryDate(e.target.checked)}
                colorScheme="primary"
                isDisabled={isLoading}
              />
            </HStack>
          </FormControl>

          {/* Guest Permissions - Chip Select */}
          <VStack w="100%" gap={4} alignItems="flex-start">
            <Heading fontSize="lg" fontWeight={500}>
              Guest permissions
            </Heading>

            <Box
              w="100%"
              borderWidth="1px"
              borderColor="neutral.400"
              borderRadius="md"
              px={3}
              py={2}
              minH="40px"
              display="flex"
              alignItems="center"
              gap={2}
              flexWrap="wrap"
              position="relative"
            >
              {selectedPermissions.length > 0 && (
                <HStack
                  spacing={2}
                  flexWrap="wrap"
                  flex={1}
                  pr={8}
                  position="relative"
                  zIndex={1}
                >
                  {selectedPermissions.map(permissionValue => {
                    const permission = QuickPollPermissionsList.find(
                      p => p.value === permissionValue
                    )
                    if (!permission) return null
                    return (
                      <Box
                        key={permission.value}
                        display="inline-block"
                        cursor="pointer"
                        onClick={() => handleRemovePermission(permission.value)}
                      >
                        <BadgeChip allowRemove={!isLoading}>
                          {permission.label}
                        </BadgeChip>
                      </Box>
                    )
                  })}
                </HStack>
              )}
              <Menu>
                <MenuButton
                  as={Box}
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  cursor="pointer"
                  zIndex={0}
                />
                <MenuList bg="bg-surface" borderColor="neutral.400">
                  {QuickPollPermissionsList.map(permission => {
                    const isSelected = selectedPermissions?.includes(
                      permission.value
                    )
                    return (
                      <MenuItem
                        key={permission.value}
                        bg={isSelected ? 'neutral.800' : 'transparent'}
                        _hover={{ bg: 'neutral.700' }}
                        onClick={() => handleTogglePermission(permission.value)}
                      >
                        <HStack gap={2} w="100%">
                          <Text>{permission.label}</Text>
                          {permission.info && (
                            <InfoTooltip text={permission.info} />
                          )}
                        </HStack>
                      </MenuItem>
                    )
                  })}
                </MenuList>
              </Menu>
              {selectedPermissions.length === 0 && (
                <Text
                  color="neutral.400"
                  fontSize="sm"
                  pr={8}
                  pointerEvents="none"
                >
                  Select permissions
                </Text>
              )}
              <Icon
                as={FaChevronDown}
                color="white"
                position="absolute"
                right={3}
                top="50%"
                transform="translateY(-50%)"
                pointerEvents="none"
              />
            </Box>
          </VStack>

          {/* Action Buttons */}
          {isEditMode ? (
            <HStack spacing={4} w="100%">
              <Button
                flex={1}
                py={3}
                h={'auto'}
                colorScheme="primary"
                onClick={handleSubmit}
                isDisabled={isLoading}
                isLoading={updatePollMutation.isLoading}
                loadingText="Updating poll..."
              >
                {updatePollMutation.isLoading
                  ? 'Updating poll...'
                  : 'Update Poll'}
              </Button>
              <Button
                flex={1}
                py={3}
                h={'auto'}
                bg="red.600"
                color="neutral.0"
                _hover={{ bg: 'red.600' }}
                onClick={openCancelModal}
                isDisabled={isLoading}
              >
                Cancel Poll
              </Button>
            </HStack>
          ) : (
            <Button
              w="100%"
              py={3}
              h={'auto'}
              colorScheme="primary"
              onClick={handleSubmit}
              isDisabled={isLoading}
              isLoading={createPollMutation.isLoading}
              loadingText="Creating poll..."
            >
              {createPollMutation.isLoading
                ? 'Creating poll...'
                : 'Create Poll'}
            </Button>
          )}
        </VStack>

        {/* Invite Participants Modal */}
        <InviteParticipants
          key={inviteKey}
          isOpen={isInviteModalOpen}
          onClose={closeInviteModal}
          isQuickPoll={true}
          groupAvailability={groupAvailability}
          groupParticipants={groupParticipants}
          participants={participants}
          handleUpdateParticipants={setParticipants}
          handleUpdateGroups={(
            groupAvailability: Record<string, string[] | undefined>,
            groupParticipants: Record<string, string[] | undefined>
          ) => {
            setGroupAvailability(groupAvailability)
            setGroupParticipants(groupParticipants)
          }}
        />

        {/* Cancel Poll Confirmation Modal */}
        {isEditMode && (
          <Modal
            onClose={closeCancelModal}
            isOpen={isCancelModalOpen}
            blockScrollOnMount={false}
            size="lg"
            isCentered
          >
            <ModalOverlay
              bg="rgba(19, 26, 32, 0.8)"
              backdropFilter="blur(10px)"
            />
            <ModalContent
              p="6"
              bg="bg-surface"
              border="1px solid"
              borderColor="card-border"
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
                <Heading size="md" color="text-primary">
                  Cancel Poll
                </Heading>
                <ModalCloseButton color="text-primary" />
              </ModalHeader>
              <ModalBody p="0" mt="6">
                <VStack gap={6}>
                  <Text size="base" color="text-primary">
                    Are you sure you want to cancel this poll? This action
                    cannot be undone.
                  </Text>
                  <HStack ml="auto" w="fit-content" mt="6" gap="4">
                    <Button
                      onClick={closeCancelModal}
                      colorScheme="neutral"
                      isDisabled={cancelPollMutation.isLoading}
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
                      _hover={{ bg: 'red.700' }}
                      isLoading={cancelPollMutation.isLoading}
                      loadingText="Cancelling poll..."
                      onClick={handleCancelPoll}
                      colorScheme="red"
                      isDisabled={cancelPollMutation.isLoading}
                    >
                      Cancel Poll
                    </Button>
                  </HStack>
                </VStack>
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </VStack>
    </Box>
  )
}

export default CreatePoll
