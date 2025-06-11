import { AddIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Switch,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { UseMutationResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AiFillClockCircle } from 'react-icons/ai'

import TimezoneSelector from '@/components/TimezoneSelector'
import { useAvailabilityBlocks } from '@/hooks/useAvailabilityBlocks'
// import { AccountContext } from '@/providers/AccountProvider'
// import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account, TimeRange } from '@/types/Account'

import { WeekdayConfig } from './weekday-config'

interface AvailabilityBlock {
  id: string
  title: string
  timezone: string
  isDefault: boolean
  availabilities: Array<{
    weekday: number
    ranges: TimeRange[]
  }>
}

const AvailabilityConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  // const { login } = useContext(AccountContext)
  // const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const {
    blocks: availabilityBlocks,
    isLoading,
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  } = useAvailabilityBlocks() as {
    blocks: AvailabilityBlock[]
    isLoading: boolean
    createBlock: UseMutationResult<
      AvailabilityBlock,
      Error,
      {
        title: string
        timezone: string
        weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
      }
    >
    updateBlock: UseMutationResult<
      AvailabilityBlock,
      Error,
      {
        id: string
        title: string
        timezone: string
        weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
      }
    >
    deleteBlock: UseMutationResult<void, Error, string>
    duplicateBlock: UseMutationResult<AvailabilityBlock, Error, string>
  }

  // Modal form state
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [newBlockTimezone, setNewBlockTimezone] = useState<
    string | null | undefined
  >(currentAccount!.preferences.timezone)
  const [newBlockAvailabilities, setNewBlockAvailabilities] = useState<
    Array<{
      weekday: number
      ranges: TimeRange[]
    }>
  >([])
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [duplicatingBlockId, setDuplicatingBlockId] = useState<string | null>(
    null
  )

  useEffect(() => {
    // Initialize empty availabilities for all days
    const emptyAvailabilities = []
    for (let i = 0; i <= 6; i++) {
      emptyAvailabilities.push({ weekday: i, ranges: [] })
    }
    setNewBlockAvailabilities(emptyAvailabilities)
  }, [])

  const getHoursPerWeek = (
    availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
  ) => {
    if (!availabilities) return '0hrs/week'

    const totalHours = availabilities.reduce((total, day) => {
      if (!day.ranges) return total

      const dayHours = day.ranges.reduce((dayTotal, range) => {
        if (!range.start || !range.end) return dayTotal

        const start = new Date(`2000-01-01T${range.start}:00`)
        const end = new Date(`2000-01-01T${range.end}:00`)
        return dayTotal + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)
      return total + dayHours
    }, 0)

    if (totalHours === 0) return '0hrs/week'

    return `${Math.round(totalHours)}hrs/week`
  }

  const formatTime = (time: string | undefined) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes}${ampm}`
  }

  const getFormattedSchedule = (
    availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
  ) => {
    if (!availabilities) return []

    // const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const workingDays = availabilities.filter(
      day => day.ranges && day.ranges.length > 0
    )

    if (workingDays.length === 0) return []

    // Group consecutive days with same time ranges
    const scheduleLines: string[] = []
    let currentGroup: number[] = []
    let currentTimeRange = ''

    workingDays.forEach((day, index) => {
      const timeRange =
        day.ranges && day.ranges.length > 0
          ? `${formatTime(day.ranges[0].start)} - ${formatTime(
              day.ranges[0].end
            )}`
          : ''

      if (index === 0) {
        currentGroup = [day.weekday]
        currentTimeRange = timeRange
      } else {
        const prevDay = workingDays[index - 1]
        const prevTimeRange =
          prevDay.ranges && prevDay.ranges.length > 0
            ? `${formatTime(prevDay.ranges[0].start)} - ${formatTime(
                prevDay.ranges[0].end
              )}`
            : ''

        if (
          timeRange === prevTimeRange &&
          day.weekday === currentGroup[currentGroup.length - 1] + 1
        ) {
          // Same time range and consecutive day
          currentGroup.push(day.weekday)
        } else {
          // Different time range or non-consecutive day, finish current group
          const groupText = formatDayGroup(currentGroup, currentTimeRange)
          if (groupText) scheduleLines.push(groupText)

          currentGroup = [day.weekday]
          currentTimeRange = timeRange
        }
      }

      // Handle last group
      if (index === workingDays.length - 1) {
        const groupText = formatDayGroup(currentGroup, currentTimeRange)
        if (groupText) scheduleLines.push(groupText)
      }
    })

    return scheduleLines
  }

  const formatDayGroup = (days: number[], timeRange: string) => {
    if (days.length === 0) return ''

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    if (days.length === 1) {
      return `${dayNames[days[0]]} : ${timeRange}`
    } else if (days.length === 2) {
      return `${dayNames[days[0]]}, ${dayNames[days[1]]} : ${timeRange}`
    } else {
      // Check if consecutive
      let consecutive = true
      for (let i = 1; i < days.length; i++) {
        if (days[i] !== days[i - 1] + 1) {
          consecutive = false
          break
        }
      }

      if (consecutive) {
        return `${dayNames[days[0]]}, ${
          dayNames[days[days.length - 1]]
        } : ${timeRange}`
      } else {
        return `${dayNames[days[0]]}, ${
          dayNames[days[days.length - 1]]
        } : ${timeRange}`
      }
    }
  }

  const handleCreateBlock = () => {
    // Initialize new block availabilities with empty ranges for all days
    const emptyAvailabilities = []
    for (let i = 0; i <= 6; i++) {
      emptyAvailabilities.push({ weekday: i, ranges: [] })
    }

    setNewBlockTitle('')
    setNewBlockTimezone(currentAccount!.preferences.timezone)
    setNewBlockAvailabilities(emptyAvailabilities)
    setSetAsDefault(false)
    setIsEditing(false)
    setEditingBlockId(null)
    setShowDeleteConfirmation(false)
    onOpen()
  }

  const handleEditBlock = (block: AvailabilityBlock) => {
    setNewBlockTitle(block.title)
    setNewBlockTimezone(block.timezone)
    setNewBlockAvailabilities([...block.availabilities])
    setSetAsDefault(block.isDefault)
    setIsEditing(true)
    setEditingBlockId(block.id)
    setShowDeleteConfirmation(false)
    onOpen()
  }

  const handleSaveNewBlock = async () => {
    if (!newBlockTitle.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your availability block.',
        status: 'error',
        duration: 3000,
        position: 'top',
        isClosable: true,
      })
      return
    }

    try {
      if (isEditing && editingBlockId) {
        await updateBlock.mutateAsync({
          id: editingBlockId,
          title: newBlockTitle,
          timezone: newBlockTimezone || 'Africa/Lagos',
          weekly_availability: newBlockAvailabilities,
        })

        toast({
          title: 'Availability block updated',
          description: `${newBlockTitle} has been updated successfully.`,
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      } else {
        await createBlock.mutateAsync({
          title: newBlockTitle,
          timezone: newBlockTimezone || 'Africa/Lagos',
          weekly_availability: newBlockAvailabilities,
        })

        toast({
          title: 'Availability block created',
          description: `${newBlockTitle} has been created successfully.`,
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      }

      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save availability block. Please try again.',
        status: 'error',
        duration: 3000,
        position: 'top',
        isClosable: true,
      })
    }
  }

  const handleDeleteBlock = async () => {
    if (editingBlockId) {
      try {
        await deleteBlock.mutateAsync(editingBlockId)
        toast({
          title: 'Availability block deleted',
          description: 'The availability block has been deleted successfully.',
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
        onClose()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete availability block. Please try again.',
          status: 'error',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      }
    }
  }

  const handleDuplicateBlock = async (blockId: string) => {
    try {
      setDuplicatingBlockId(blockId)
      await duplicateBlock.mutateAsync(blockId)
      toast({
        title: 'Availability block duplicated',
        description: 'The availability block has been duplicated successfully.',
        status: 'success',
        duration: 3000,
        position: 'top',
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'Failed to duplicate availability block. Please try again.',
        status: 'error',
        duration: 3000,
        position: 'top',
        isClosable: true,
      })
    } finally {
      setDuplicatingBlockId(null)
    }
  }

  const handleShowDeleteConfirmation = () => {
    setShowDeleteConfirmation(true)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
  }

  const onNewBlockAvailabilityChange = (
    day: number,
    ranges: TimeRange[] | null
  ) => {
    const newAvailabilities = [...newBlockAvailabilities]
    newAvailabilities[day] = { weekday: day, ranges: ranges ?? [] }
    setNewBlockAvailabilities(newAvailabilities)
  }

  const getCurrentEditingBlock = () => {
    return availabilityBlocks?.find(block => block.id === editingBlockId)
  }

  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Spinner size="xl" color="orange.500" />
      </Flex>
    )
  }

  return (
    <VStack alignItems="start" flex={1} mb={8} spacing={6}>
      <Heading fontSize="2xl" color="white">
        My Availability
      </Heading>

      <Box
        width={880}
        maxHeight={860}
        overflowY="auto"
        padding={8}
        borderRadius={12}
        background="#141A1F"
      >
        <Flex align="flex-start" justify="space-between" mb={4}>
          <Box width={533}>
            <Heading fontSize={22} color="white" mb={2}>
              Availability blocks
            </Heading>
            <Text color="#FFFFFF" fontSize={16}>
              Define when you&apos;re free to meet. Different{' '}
              <Text as="span" color="#F9B19A" textDecoration="underline">
                groups
              </Text>{' '}
              and{' '}
              <Text as="span" color="#F9B19A" textDecoration="underline">
                session types
              </Text>{' '}
              can use different availability blocks.
            </Text>
          </Box>
          <Button
            leftIcon={<AddIcon color="#2D3748" />}
            colorScheme="orange"
            bg="#F9B19A"
            color="#191D27"
            _hover={{ bg: '#F9B19A' }}
            onClick={handleCreateBlock}
            fontSize="sm"
            px={6}
          >
            New Availability block
          </Button>
        </Flex>

        <Flex flexDirection="column" gap={6} flexWrap="wrap" mt={7}>
          {availabilityBlocks?.map(block => (
            <Box
              key={block.id}
              bg="#141A1F"
              border="1px solid"
              borderColor="#7B8794"
              borderRadius={12}
              p={6}
              width="100%"
              position="relative"
            >
              <Flex justify="space-between" align="flex-start" mb={4}>
                <Flex align="flex-start" justify="space-between" w="100%">
                  <HStack spacing={5}>
                    <Heading fontSize={20} fontWeight={500} color="white">
                      {block.title}
                    </Heading>
                    {block.isDefault && (
                      <Badge
                        background="#00CE5D"
                        borderRadius={8}
                        color="#FFFFFF"
                        fontSize={12.8}
                        textTransform="none"
                        fontWeight={500}
                        px={4}
                        py={1}
                      >
                        Default
                      </Badge>
                    )}
                  </HStack>
                  <HStack color="gray.400" fontSize="sm">
                    <HStack
                      spacing={1}
                      background="#323F4B"
                      borderRadius={8}
                      fontSize={12.8}
                      px={3}
                      py={1}
                    >
                      <Box as="span" fontSize={16}>
                        <AiFillClockCircle color="#FFFFFF" />
                      </Box>
                      <Text color="#FFFFFF">
                        {getHoursPerWeek(block.availabilities)}
                      </Text>
                    </HStack>
                  </HStack>
                </Flex>
              </Flex>

              <VStack align="start" spacing={2} mb={4}>
                <Flex
                  direction="column"
                  gap={3}
                  borderBottom="1px solid"
                  borderColor="#7B8794"
                  pb={3}
                  width="100%"
                >
                  {getFormattedSchedule(block.availabilities).map(
                    (line, index) => (
                      <Text
                        key={index}
                        color="#9AA5B1"
                        fontWeight={500}
                        fontSize={16}
                      >
                        {line}
                      </Text>
                    )
                  )}
                </Flex>

                <Text color="#9AA5B1" fontWeight={500} fontSize={16}>
                  Timezone: {block.timezone}
                </Text>
              </VStack>

              <Flex justify="space-between" align="center" mt={6}>
                <Button
                  bg="#F9B19A"
                  color="#323F4B"
                  _hover={{ bg: '#F9B19A' }}
                  fontSize={15}
                  fontWeight={700}
                  width="185px"
                  height="38px"
                  borderRadius={8}
                  onClick={() => handleEditBlock(block)}
                >
                  Manage availability
                </Button>
                <Button
                  bg="transparent"
                  color="#F9B19A"
                  _hover={{ bg: 'transparent' }}
                  fontSize={15}
                  fontWeight={700}
                  width="160px"
                  height="38px"
                  border="1px solid"
                  borderColor="#F9B19A"
                  borderRadius={8}
                  onClick={() => handleDuplicateBlock(block.id)}
                  isLoading={duplicatingBlockId === block.id}
                >
                  Duplicate
                </Button>
              </Flex>
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Modal for creating/editing availability block */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="#141A1F"
          border="1px solid"
          borderRadius={12}
          borderColor="#323F4B"
          minHeight="21rem"
          maxHeight="38.75rem"
          overflowY="hidden"
        >
          <Box
            overflowY="auto"
            sx={{
              scrollbarGutter: 'stable both-edges',
              '&::-webkit-scrollbar': {
                width: '6px',
                background: 'transparent',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'transparent',
                borderRadius: '3px',
                transition: 'background 0.2s ease',
              },
              '&:hover::-webkit-scrollbar-thumb': {
                background: '#323F4B',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#4A5568',
              },
              '&::-webkit-scrollbar-corner': {
                background: 'transparent',
              },
            }}
          >
            {!showDeleteConfirmation ? (
              <>
                <ModalHeader color="white" pb={2}>
                  <Flex justify="space-between" align="center">
                    <Flex alignItems="flex-end" gap={2}>
                      <Text color="#FFFFFF" fontWeight={700} fontSize={22}>
                        {newBlockTitle || 'Default title'}
                      </Text>
                    </Flex>
                    <Button
                      colorScheme="orange"
                      bg="#F9B19A"
                      color="#191D27"
                      _hover={{ bg: '#F9B19A' }}
                      size="sm"
                      onClick={handleSaveNewBlock}
                      width="70px"
                      height="40px"
                      borderRadius={8}
                      isLoading={createBlock.isLoading || updateBlock.isLoading}
                    >
                      Save
                    </Button>
                  </Flex>
                  <HStack spacing={4} mt={5}>
                    <Switch
                      size="lg"
                      colorScheme="primary"
                      isChecked={setAsDefault}
                      _active={{ border: 'none' }}
                      onChange={e => setSetAsDefault(e.target.checked)}
                    />
                    <Text color="white" fontSize={16} fontWeight={700}>
                      Set as default
                    </Text>
                  </HStack>
                </ModalHeader>

                <ModalBody pb={6}>
                  <VStack spacing={6} align="stretch">
                    <FormControl>
                      <FormLabel
                        color="white"
                        fontSize={15}
                        fontWeight={500}
                        mb={2}
                      >
                        Title
                      </FormLabel>
                      <Input
                        placeholder="Enter availability block title"
                        value={newBlockTitle}
                        onChange={e => setNewBlockTitle(e.target.value)}
                        bg="#141A1F"
                        border="1px solid"
                        borderColor="#323F4B"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{
                          borderColor: '#FF8A65',
                          boxShadow: '0 0 0 1px #FF8A65',
                        }}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel
                        color="white"
                        fontSize={15}
                        fontWeight={500}
                        mb={2}
                      >
                        Timezone
                      </FormLabel>
                      <TimezoneSelector
                        value={newBlockTimezone}
                        onChange={setNewBlockTimezone}
                      />
                    </FormControl>

                    <Box>
                      {newBlockAvailabilities.map((availability, index) => (
                        <WeekdayConfig
                          key={`${
                            isEditing ? editingBlockId : 'new-block'
                          }-${index}`}
                          dayAvailability={availability}
                          onChange={onNewBlockAvailabilityChange}
                        />
                      ))}
                    </Box>

                    <Flex justify="flex-end" align="center" pt={4}>
                      {isEditing && (
                        <Button
                          colorScheme="orange"
                          bg="#EB001B"
                          color="#FFFFFF"
                          _hover={{ bg: '#EB001B' }}
                          size="sm"
                          onClick={handleShowDeleteConfirmation}
                          width="253px"
                          height="48px"
                          borderRadius={8}
                          fontSize={16}
                          fontWeight={700}
                        >
                          Delete this availability block
                        </Button>
                      )}
                    </Flex>
                  </VStack>
                </ModalBody>
              </>
            ) : (
              // Delete Confirmation Screen
              <Box p={6}>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Text color="white" fontSize={20} fontWeight={500} mb={4}>
                      You are about to delete the{' '}
                      <Text
                        as="span"
                        color="#F9B19A"
                        textDecoration="underline"
                      >
                        {getCurrentEditingBlock()?.title || 'working hours'}
                      </Text>{' '}
                      availability block
                    </Text>

                    <VStack align="start" spacing={2} mb={6}>
                      {getCurrentEditingBlock() &&
                        getFormattedSchedule(
                          getCurrentEditingBlock()!.availabilities
                        ).map((line, index) => (
                          <Text
                            key={index}
                            color="#9AA5B1"
                            fontSize={16}
                            fontWeight={500}
                          >
                            {line}
                          </Text>
                        ))}

                      <Box
                        borderTop="1px solid"
                        borderColor="#7B8794"
                        width="100%"
                        my={3}
                      />

                      <Text color="#9AA5B1" fontSize={16} fontWeight={500}>
                        Timezone: {getCurrentEditingBlock()?.timezone}
                      </Text>
                    </VStack>

                    <Text color="#FF0000" fontSize={16} fontWeight={500} mb={6}>
                      Deleting this availability block will affect your
                      availability in those groups and session types you have.
                    </Text>
                  </Box>

                  <Flex justify="space-between" align="center">
                    <Button
                      bg="#F9B19A"
                      color="#191D27"
                      _hover={{ bg: '#F9B19A' }}
                      onClick={handleCancelDelete}
                      width="157px"
                      height="48px"
                      borderRadius={8}
                      fontSize={16}
                      fontWeight={700}
                    >
                      No, don&apos;t delete
                    </Button>
                    <Button
                      bg="transparent"
                      color="#FF0000"
                      border="1px solid"
                      borderColor="#FF0000"
                      _hover={{ bg: 'transparent' }}
                      onClick={handleDeleteBlock}
                      width="84px"
                      height="48px"
                      borderRadius={8}
                      fontSize={16}
                      fontWeight={700}
                      isLoading={deleteBlock.isLoading}
                    >
                      Delete
                    </Button>
                  </Flex>
                </VStack>
              </Box>
            )}
          </Box>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default AvailabilityConfig
