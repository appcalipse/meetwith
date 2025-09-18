import { AddIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Select,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { useRouter } from 'next/router'
import React, { useCallback, useContext, useMemo, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import { HiOutlineUserAdd } from 'react-icons/hi'

import { ChipInput } from '@/components/chip-input'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import InfoTooltip from '@/components/profile/components/Tooltip'
import InviteParticipants from '@/components/schedule/participants/InviteParticipants'
import { AccountContext } from '@/providers/AccountProvider'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import {
  DEFAULT_GROUP_SCHEDULING_DURATION,
  QuickPollPermissionsList,
} from '@/utils/constants/schedule'
import { deduplicateArray } from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

const CreatePoll = () => {
  const { push } = useRouter()
  const [isTitleValid, setIsTitleValid] = useState(true)
  const [isDurationValid, setIsDurationValid] = useState(true)
  const [isParticipantsValid, setIsParticipantsValid] = useState(true)

  const {
    isOpen: isInviteModalOpen,
    onOpen: openInviteModal,
    onClose: closeInviteModal,
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
  const { currentAccount } = useContext(AccountContext)

  const [formData, setFormData] = useState({
    title: '',
    duration: 30,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    expiryDate: new Date(),
    expiryTime: new Date(),
    description: '',
  })

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'see_guest_list',
  ])

  // Get all participants
  const allMergedParticipants = useMemo(() => {
    const merged = getMergedParticipants(
      participants,
      allGroups,
      groupParticipants,
      currentAccount?.address
    )

    // Deduplicate by account_address and guest_email
    const deduplicatedParticipants = merged.reduce(
      (acc: ParticipantInfo[], current) => {
        const existing = acc.find(
          p =>
            (p.account_address &&
              current.account_address &&
              p.account_address.toLowerCase() ===
                current.account_address.toLowerCase()) ||
            (p.guest_email &&
              current.guest_email &&
              p.guest_email.toLowerCase() === current.guest_email.toLowerCase())
        )
        if (!existing) {
          acc.push(current)
        }
        return acc
      },
      []
    )

    return deduplicatedParticipants
  }, [participants, allGroups, groupParticipants, currentAccount?.address])

  const handleSubmit = () => {
    // Form validation
    if (!formData.title) {
      setIsTitleValid(false)
    } else {
      setIsTitleValid(true)
    }
    if (!formData.duration) {
      setIsDurationValid(false)
    } else {
      setIsDurationValid(true)
    }
    if (allMergedParticipants.length === 0) {
      setIsParticipantsValid(false)
    } else {
      setIsParticipantsValid(true)
    }

    if (
      !formData.title ||
      !formData.duration ||
      allMergedParticipants.length === 0
    ) {
      return
    }
  }

  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const currentMerged = allMergedParticipants
      const isRemoval = _participants.length < currentMerged.length

      if (isRemoval) {
        // Find which participant was removed
        const removedParticipant = currentMerged.find(
          current =>
            !_participants.some(
              newP =>
                (current.account_address &&
                  newP.account_address &&
                  current.account_address.toLowerCase() ===
                    newP.account_address.toLowerCase()) ||
                (current.guest_email &&
                  newP.guest_email &&
                  current.guest_email.toLowerCase() ===
                    newP.guest_email.toLowerCase())
            )
        )

        if (removedParticipant) {
          const account_address =
            removedParticipant.account_address?.toLowerCase()
          const guest_email = removedParticipant.guest_email?.toLowerCase()

          React.startTransition(() => {
            setParticipants(prev =>
              prev.filter(p => {
                if (isGroupParticipant(p)) return true

                if (
                  account_address &&
                  p.account_address?.toLowerCase() === account_address
                ) {
                  return false
                }

                if (
                  guest_email &&
                  p.guest_email?.toLowerCase() === guest_email
                ) {
                  return false
                }

                return true
              })
            )

            if (
              account_address &&
              account_address !== currentAccount?.address
            ) {
              const keys = Object.keys(groupAvailability)
              for (const key of keys) {
                setGroupParticipants(prev => {
                  const allGroupParticipants = prev[key] || []
                  const newParticipants = allGroupParticipants.filter(
                    val => val !== account_address
                  )
                  return {
                    ...prev,
                    [key]: newParticipants,
                  }
                })

                setGroupAvailability(prev => {
                  const allGroupAvailability = prev[key] || []
                  const newAvailability = allGroupAvailability.filter(
                    val => val !== account_address
                  )
                  return {
                    ...prev,
                    [key]: newAvailability,
                  }
                })
              }
            }
          })
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
            return [...groupParticipants, ..._participants]
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

      if (_participants.length > 0) {
        setIsParticipantsValid(true)
      }
    },
    [
      setParticipants,
      setGroupAvailability,
      setGroupParticipants,
      allMergedParticipants,
    ]
  )

  return (
    <Box
      width="100%"
      minHeight="100vh"
      bg="neutral.850"
      px={{ base: 4, md: 8 }}
      py={8}
      display="flex"
      justifyContent="center"
    >
      <VStack spacing={8} align="stretch" maxW="600px" width="100%">
        {/* Header with Back Button */}
        <VStack spacing={4} align="flex-start">
          <HStack
            color="primary.400"
            cursor="pointer"
            onClick={() => push('/dashboard/quickpoll')}
            _hover={{ color: 'primary.500' }}
          >
            <Icon as={FaArrowLeft} />
            <Text fontWeight="medium">Back</Text>
          </HStack>

          <Heading
            as="h1"
            fontSize="x-large"
            fontWeight="bold"
            color="white"
            textAlign="left"
            width="100%"
          >
            Create Poll
          </Heading>
        </VStack>

        {/* Form */}
        <VStack spacing={6} align="stretch">
          {/* Title and Duration - Same Line */}
          <HStack spacing={4} align="end">
            <FormControl isInvalid={!isTitleValid} flex={3}>
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
                  if (!isTitleValid && e.target.value) {
                    setIsTitleValid(true)
                  }
                  setFormData({ ...formData, title: e.target.value })
                }}
                errorBorderColor="red.500"
                isInvalid={!isTitleValid}
              />
              {!isTitleValid && (
                <FormHelperText color="red.500">
                  Title is required
                </FormHelperText>
              )}
            </FormControl>

            <FormControl
              w={'max-content'}
              isInvalid={!isDurationValid}
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
                onChange={e =>
                  setFormData({ ...formData, duration: Number(e.target.value) })
                }
                value={formData.duration}
                borderColor="neutral.400"
                width={'max-content'}
                maxW="350px"
                isInvalid={!isDurationValid}
                errorBorderColor="red.500"
              >
                {DEFAULT_GROUP_SCHEDULING_DURATION.map(type => (
                  <option key={type.id} value={type.duration}>
                    {durationToHumanReadable(type.duration)}
                  </option>
                ))}
              </Select>
              {!isDurationValid && (
                <FormHelperText color="red.500">
                  Duration is required
                </FormHelperText>
              )}
            </FormControl>
          </HStack>

          {/* Meeting Date Range */}
          <FormControl>
            <FormLabel htmlFor="date">
              Meeting Date options (From → To)
            </FormLabel>
            <HStack w={'100%'} gap={4}>
              <SingleDatepicker
                date={formData.startDate}
                onDateChange={date =>
                  setFormData({ ...formData, startDate: date })
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
              />
              <SingleDatepicker
                date={formData.endDate}
                onDateChange={date =>
                  setFormData({ ...formData, endDate: date })
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
              />
            </HStack>
          </FormControl>

          {/* Add Guest from Groups */}
          <FormControl w="100%" maxW="100%">
            <FormLabel htmlFor="participants">
              Add Participants to the meeting
              <Text color="red.500" display="inline">
                *
              </Text>{' '}
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
                  isInvalid: !isParticipantsValid,
                  errorBorderColor: 'red.500',
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
                  >
                    <HiOutlineUserAdd color="white" size={20} />
                  </Button>
                }
              />
            </Box>
            <FormHelperText minW={{ md: '600px' }}>
              {isParticipantsValid ? (
                <Text>
                  Separate participants by comma. You will be added
                  automatically, no need to insert yourself.
                </Text>
              ) : (
                <Text color="red.500">Participants are required</Text>
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
                setFormData({ ...formData, description: e.target.value })
              }
              bg="neutral.850"
              border="1px solid"
              borderColor="neutral.400"
              color="neutral.0"
              _placeholder={{ color: 'neutral.400' }}
              rows={4}
            />
          </FormControl>

          {/* Poll Expiry Date */}
          <FormControl>
            <FormLabel htmlFor="expiry-date">Poll Expiry Date</FormLabel>
            <HStack w={'100%'} gap={4}>
              <SingleDatepicker
                date={formData.expiryDate}
                onDateChange={date =>
                  setFormData({ ...formData, expiryDate: date })
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
              />
              <InputTimePicker
                value={format(formData.expiryTime, 'p')}
                onChange={time =>
                  setFormData({ ...formData, expiryTime: new Date(time) })
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
                }}
                iconColor="neutral.400"
                iconSize={20}
              />
            </HStack>
          </FormControl>

          {/* Guest Permissions - Using ScheduleBase pattern */}
          <VStack w="100%" gap={4} alignItems="flex-start">
            <Heading fontSize="lg" fontWeight={500}>
              Guest permissions
            </Heading>

            {QuickPollPermissionsList.map(permission => (
              <Checkbox
                key={permission.value}
                isChecked={selectedPermissions?.includes(permission.value)}
                w="100%"
                colorScheme="primary"
                flexDir="row-reverse"
                justifyContent={'space-between'}
                fontWeight={700}
                color="primary.200"
                fontSize="16px"
                size={'lg'}
                p={0}
                marginInlineStart={0}
                onChange={e => {
                  const { checked } = e.target
                  setSelectedPermissions(prev =>
                    checked
                      ? (prev || []).concat(permission.value)
                      : prev?.filter(p => p !== permission.value) || []
                  )
                }}
              >
                <HStack marginInlineStart={-2} gap={0}>
                  <Text>{permission.label}</Text>
                </HStack>
              </Checkbox>
            ))}
          </VStack>

          {/* Create Poll Button - Full width orange bar */}
          <Button
            w="100%"
            py={3}
            h={'auto'}
            colorScheme="primary"
            onClick={handleSubmit}
            isDisabled={
              allMergedParticipants.length === 0 ||
              !formData.title ||
              !formData.duration
            }
          >
            Create Poll
          </Button>
        </VStack>

        {/* Invite Participants Modal */}
        <InviteParticipants
          isOpen={isInviteModalOpen}
          onClose={closeInviteModal}
        />
      </VStack>
    </Box>
  )
}

export default CreatePoll
