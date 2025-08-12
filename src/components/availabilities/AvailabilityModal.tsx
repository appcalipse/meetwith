import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { Select as ChakraSelect } from 'chakra-react-select'
import { useEffect, useRef, useState } from 'react'
import { MdKeyboard, MdMouse } from 'react-icons/md'

import TimezoneSelector from '@/components/TimezoneSelector'
import { useUpdateAvailabilityBlockMeetingTypes } from '@/hooks/availability'
import { useAllMeetingTypes } from '@/hooks/useAllMeetingTypes'
import { TimeRange } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import {
  getDayName,
  getFormattedSchedule,
  handleCopyToDays,
  sortAvailabilitiesByWeekday,
} from '@/utils/availability.helper'
import { Option } from '@/utils/constants/select'

import { WeekdayConfig } from './WeekdayConfig'

interface AvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  isEditing: boolean
  editingBlockId: string | null
  duplicatingBlockId: string | null
  showDeleteConfirmation: boolean
  showSelectDefaultModal?: boolean
  selectDefaultModalConfig?: {
    title: string
    description: string
    confirmButtonText: string
    onConfirm: (selectedBlockId: string) => void
  }
  availableBlocks?: AvailabilityBlock[]
  currentDefaultBlockId?: string
  onCloseSelectDefaultModal?: () => void
  formState: {
    title: string
    timezone: string | null | undefined
    availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
    isDefault: boolean
  }
  onTitleChange: (title: string) => void
  onTimezoneChange: (timezone: string | null | undefined) => void
  onAvailabilityChange: (day: number, ranges: TimeRange[] | null) => void
  onIsDefaultChange: (isDefault: boolean) => void
  onSave: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onShowDeleteConfirmation: () => void
  isLoading: boolean
  currentEditingBlock?: AvailabilityBlock
  onMeetingTypesChange?: (meetingTypeIds: string[]) => void
}

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  editingBlockId,
  duplicatingBlockId,
  showDeleteConfirmation,
  showSelectDefaultModal,
  selectDefaultModalConfig,
  availableBlocks,
  currentDefaultBlockId,
  onCloseSelectDefaultModal,
  formState,
  onTitleChange,
  onTimezoneChange,
  onAvailabilityChange,
  onIsDefaultChange,
  onSave,
  onDelete,
  onCancelDelete,
  onShowDeleteConfirmation,
  isLoading,
  currentEditingBlock,
  onMeetingTypesChange,
}) => {
  const [useDirectInput, setUseDirectInput] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Set<number>>(
    new Set()
  )
  const toast = useToast()
  const [selectedMeetingTypes, setSelectedMeetingTypes] = useState<
    Option<string>[]
  >([])
  const [selectedBlockId, setSelectedBlockId] = useState<string>('')
  const hasInitialized = useRef(false)

  const { meetingTypes: allMeetingTypes } = useAllMeetingTypes()

  const blockId =
    isOpen && (editingBlockId || duplicatingBlockId)
      ? editingBlockId || duplicatingBlockId || ''
      : ''

  const currentBlock = availableBlocks?.find(block => block.id === blockId)
  const currentMeetingTypes = currentBlock?.meetingTypes || []

  const { updateMeetingTypes, isUpdating: isUpdatingMeetingTypes } =
    useUpdateAvailabilityBlockMeetingTypes(blockId)

  const meetingTypeOptions: Option<string>[] = allMeetingTypes.map(type => ({
    value: type.id,
    label: type.title,
  }))

  const validCurrentMeetingTypes = (currentMeetingTypes || []).filter(
    type => type && type.title
  )

  const initializeMeetingTypes = () => {
    if (isEditing && editingBlockId && validCurrentMeetingTypes.length > 0) {
      const meetingTypeOptions = validCurrentMeetingTypes.map(type => ({
        value: type.id,
        label: type.title,
      }))
      setSelectedMeetingTypes(meetingTypeOptions)
      if (onMeetingTypesChange) {
        onMeetingTypesChange(meetingTypeOptions.map(option => option.value))
      }
    } else if (duplicatingBlockId && validCurrentMeetingTypes.length > 0) {
      const meetingTypeOptions = validCurrentMeetingTypes.map(type => ({
        value: type.id,
        label: type.title,
      }))
      setSelectedMeetingTypes(meetingTypeOptions)
      if (onMeetingTypesChange) {
        onMeetingTypesChange(meetingTypeOptions.map(option => option.value))
      }
    } else if (!isEditing && !duplicatingBlockId) {
      setSelectedMeetingTypes([])
      if (onMeetingTypesChange) {
        onMeetingTypesChange([])
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (
        currentMeetingTypes.length > 0 &&
        selectedMeetingTypes.length === 0 &&
        !hasInitialized.current
      ) {
        initializeMeetingTypes()
        hasInitialized.current = true
      }
    } else {
      if (selectedMeetingTypes.length > 0) {
        setSelectedMeetingTypes([])
        if (onMeetingTypesChange) {
          onMeetingTypesChange([])
        }
      }
      hasInitialized.current = false
    }
  }, [
    isOpen,
    currentMeetingTypes.length,
    selectedMeetingTypes.length,
    isEditing,
    editingBlockId,
    duplicatingBlockId,
  ])

  const handleMeetingTypesChange = (selectedOptions: Option<string>[]) => {
    setSelectedMeetingTypes(selectedOptions)
    if (onMeetingTypesChange) {
      const meetingTypeIds = selectedOptions.map(option => option.value)
      onMeetingTypesChange(meetingTypeIds)
    }
  }

  const handleSave = async () => {
    if (isEditing && editingBlockId) {
      onSave()
      const meetingTypeIds = selectedMeetingTypes.map(option => option.value)
      updateMeetingTypes(meetingTypeIds)
    } else {
      onSave()
    }
  }

  const handleCopyToDaysLocal = (
    sourceWeekday: number,
    ranges: TimeRange[],
    copyType: 'all' | 'weekdays' | 'weekends'
  ) => {
    const result = handleCopyToDays(
      sourceWeekday,
      ranges,
      copyType,
      formState.availabilities,
      onAvailabilityChange
    )

    toast({
      title: 'Copied successfully',
      description: `Time ranges copied from ${getDayName(sourceWeekday)} to ${
        result.copyTypeText
      }.`,
      status: 'success',
      duration: 3000,
      position: 'top',
      isClosable: true,
    })
  }

  const handleValidationChange = (weekday: number, isValid: boolean) => {
    setValidationErrors(prev => {
      const newErrors = new Set(prev)
      if (isValid) {
        newErrors.delete(weekday)
      } else {
        newErrors.add(weekday)
      }
      return newErrors
    })
  }

  const hasValidationErrors = validationErrors.size > 0

  const toggleInputMode = () => {
    setUseDirectInput(!useDirectInput)
  }

  const handleClose = () => {
    if (showSelectDefaultModal) {
      setSelectedBlockId('')
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="neutral.900"
        border="1px solid"
        borderRadius={{ base: 0, md: 12 }}
        borderColor="neutral.800"
        minHeight={{ base: '100%', md: '21rem' }}
        maxHeight={{ base: '100%', md: '90vh' }}
        minWidth={{ base: '100%', md: '600px' }}
        overflowY="hidden"
        margin={{ base: 0, md: 4 }}
        width={{ base: '800px', md: 'auto' }}
      >
        <Box
          overflowY="auto"
          px={{ base: 0, md: 2 }}
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
              background: 'neutral.800',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'neutral.600',
            },
            '&::-webkit-scrollbar-corner': {
              background: 'transparent',
            },
          }}
        >
          {showSelectDefaultModal ? (
            <>
              <ModalHeader color="neutral.0" pb={2}>
                <Text color="neutral.0" fontWeight={700} fontSize={22}>
                  {selectDefaultModalConfig?.title}
                </Text>
              </ModalHeader>

              <ModalBody pb={6} px={{ base: 4, md: 6 }}>
                <VStack spacing={6} align="stretch">
                  <Text color="neutral.300" fontSize={16}>
                    {selectDefaultModalConfig?.description}
                  </Text>

                  {availableBlocks && availableBlocks.length === 0 ? (
                    <Box
                      bg="neutral.800"
                      borderRadius={8}
                      p={4}
                      border="1px solid"
                      borderColor="neutral.700"
                    >
                      <Text color="neutral.300" fontSize={14}>
                        No other availability blocks available. Please create
                        another availability block first.
                      </Text>
                    </Box>
                  ) : (
                    <RadioGroup
                      value={selectedBlockId}
                      onChange={setSelectedBlockId}
                    >
                      <Stack spacing={3}>
                        {availableBlocks
                          ?.filter(block => block.id !== currentDefaultBlockId)
                          .map(block => (
                            <Box
                              key={block.id}
                              bg="neutral.850"
                              borderRadius={8}
                              p={4}
                              border="1px solid"
                              borderColor={
                                selectedBlockId === block.id
                                  ? 'primary.200'
                                  : 'neutral.700'
                              }
                              _hover={{
                                borderColor: isLoading
                                  ? 'neutral.700'
                                  : 'primary.200',
                              }}
                              cursor={isLoading ? 'not-allowed' : 'pointer'}
                              onClick={() => {
                                if (!isLoading) {
                                  setSelectedBlockId(block.id)
                                }
                              }}
                              opacity={isLoading ? 0.6 : 1}
                            >
                              <Radio
                                value={block.id}
                                colorScheme="orange"
                                isChecked={selectedBlockId === block.id}
                                isDisabled={isLoading}
                              >
                                <VStack align="start" spacing={1} ml={2}>
                                  <Text
                                    color="neutral.0"
                                    fontWeight={500}
                                    fontSize={16}
                                  >
                                    {block.title}
                                  </Text>
                                  <Text color="neutral.300" fontSize={14}>
                                    {block.timezone}
                                  </Text>
                                </VStack>
                              </Radio>
                            </Box>
                          ))}
                      </Stack>
                    </RadioGroup>
                  )}

                  <Flex
                    justify="space-between"
                    align="center"
                    pt={4}
                    gap={4}
                    flexDirection={{ base: 'column', sm: 'row' }}
                  >
                    <Button
                      bg="transparent"
                      color="primary.200"
                      _hover={{ bg: 'transparent' }}
                      fontSize={16}
                      fontWeight={700}
                      width={{ base: '100%', sm: '100px' }}
                      height="48px"
                      border="1px solid"
                      borderColor="primary.200"
                      borderRadius={8}
                      onClick={() => {
                        if (onCloseSelectDefaultModal) {
                          onCloseSelectDefaultModal()
                        }
                      }}
                      isDisabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      colorScheme="orange"
                      bg="primary.200"
                      color="neutral.800"
                      _hover={{ bg: 'primary.200' }}
                      size="sm"
                      onClick={() => {
                        if (selectedBlockId && selectDefaultModalConfig) {
                          selectDefaultModalConfig.onConfirm(selectedBlockId)
                        }
                      }}
                      px={6}
                      height="48px"
                      borderRadius={8}
                      isLoading={isLoading}
                      isDisabled={
                        !selectedBlockId ||
                        !availableBlocks ||
                        availableBlocks.length === 0 ||
                        isLoading
                      }
                    >
                      {selectDefaultModalConfig?.confirmButtonText}
                    </Button>
                  </Flex>
                </VStack>
              </ModalBody>
            </>
          ) : !showDeleteConfirmation ? (
            <>
              {/* Sticky header for edit and duplicate modes */}
              {(isEditing || duplicatingBlockId) && (
                <Box
                  position="sticky"
                  top={0}
                  bg="neutral.900"
                  zIndex={1}
                  px={{ base: 4, md: 6 }}
                  py={4}
                >
                  <Flex justify="space-between" align="center">
                    <Text color="neutral.0" fontWeight={700} fontSize={22}>
                      {isEditing
                        ? 'Edit Availability Block'
                        : 'New Availability Block'}
                    </Text>
                    <Button
                      colorScheme="orange"
                      bg="primary.200"
                      color="neutral.800"
                      _hover={{ bg: 'primary.200' }}
                      size="sm"
                      onClick={handleSave}
                      width={{ base: '100px', md: '120px' }}
                      height={{ base: '36px', md: '40px' }}
                      borderRadius={8}
                      isLoading={isLoading}
                      isDisabled={isLoading || hasValidationErrors}
                    >
                      Save changes
                    </Button>
                  </Flex>
                </Box>
              )}

              {/* Regular header for create mode */}
              {!isEditing && !duplicatingBlockId && (
                <ModalHeader color="neutral.0" pb={2}>
                  <Text color="neutral.0" fontWeight={700} fontSize={22}>
                    New Availability Block
                  </Text>
                </ModalHeader>
              )}

              <ModalBody pb={6} px={{ base: 4, md: 6 }}>
                <VStack spacing={6} align="stretch">
                  {/* Set as default switch - moved from header to body */}
                  <HStack spacing={4}>
                    <Switch
                      size="lg"
                      colorScheme="primary"
                      isChecked={formState.isDefault}
                      _active={{ border: 'none' }}
                      onChange={e => onIsDefaultChange(e.target.checked)}
                    />
                    <Text color="neutral.0" fontSize={16} fontWeight={700}>
                      Set as default
                    </Text>
                  </HStack>

                  <FormControl>
                    <FormLabel
                      color="neutral.0"
                      fontSize={15}
                      fontWeight={500}
                      mb={2}
                    >
                      Title
                    </FormLabel>
                    <Input
                      placeholder="Enter availability block title"
                      value={formState.title}
                      onChange={e => onTitleChange(e.target.value)}
                      bg="neutral.900"
                      border="1px solid"
                      borderColor="neutral.800"
                      color="neutral.0"
                      _placeholder={{ color: 'neutral.300' }}
                      _focus={{
                        borderColor: 'orange.400',
                        boxShadow: '0 0 0 1px var(--chakra-colors-orange-400)',
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel
                      color="neutral.0"
                      fontSize={15}
                      fontWeight={500}
                      mb={2}
                    >
                      Timezone
                    </FormLabel>
                    <TimezoneSelector
                      value={formState.timezone}
                      onChange={onTimezoneChange}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel
                      color="neutral.0"
                      fontSize={15}
                      fontWeight={500}
                      mb={2}
                    >
                      Associated Meeting Types
                    </FormLabel>
                    <ChakraSelect
                      value={selectedMeetingTypes}
                      onChange={(newValue: unknown) => {
                        const newSelectedTypes =
                          (newValue as Option<string>[]) || []
                        handleMeetingTypesChange(newSelectedTypes)
                      }}
                      options={meetingTypeOptions}
                      isMulti
                      placeholder="Select meeting types to associate with this block..."
                      isDisabled={isUpdatingMeetingTypes}
                      chakraStyles={{
                        control: provided => ({
                          ...provided,
                          background: 'neutral.900',
                          borderColor: 'neutral.800',
                          color: 'neutral.0',
                        }),
                      }}
                    />
                    <Text color="neutral.300" fontSize={14} mt={2}>
                      Select which meeting types should use this availability
                      block.
                    </Text>
                  </FormControl>

                  <Box>
                    <Flex
                      justify="space-between"
                      align="center"
                      mb={4}
                      flexDirection={{ base: 'column', sm: 'row' }}
                      gap={2}
                    >
                      <Text color="neutral.0" fontSize={16} fontWeight={500}>
                        Weekly Schedule
                      </Text>
                      <HStack spacing={2}>
                        <Text color="neutral.300" fontSize={14}>
                          {useDirectInput
                            ? 'Direct input mode'
                            : 'Dropdown mode'}
                        </Text>
                        <Tooltip
                          label={
                            useDirectInput
                              ? 'Switch to dropdown mode'
                              : 'Switch to direct input mode'
                          }
                          placement="top"
                          hasArrow
                          bg="neutral.800"
                          color="neutral.0"
                          borderRadius="md"
                          fontSize="sm"
                          px={3}
                          py={2}
                        >
                          <IconButton
                            color="neutral.300"
                            aria-label="toggle input mode"
                            icon={
                              useDirectInput ? (
                                <MdMouse size={16} />
                              ) : (
                                <MdKeyboard size={16} />
                              )
                            }
                            onClick={toggleInputMode}
                            size="sm"
                            variant="ghost"
                          />
                        </Tooltip>
                      </HStack>
                    </Flex>
                    <Box overflowX="hidden">
                      {sortAvailabilitiesByWeekday(
                        formState.availabilities
                      ).map(availability => (
                        <WeekdayConfig
                          key={`${isEditing ? editingBlockId : 'new-block'}-${
                            availability.weekday
                          }`}
                          dayAvailability={availability}
                          onChange={onAvailabilityChange}
                          onCopyToDays={handleCopyToDaysLocal}
                          useDirectInput={useDirectInput}
                          onValidationChange={handleValidationChange}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Flex
                    justify="space-between"
                    align="center"
                    pt={4}
                    gap={4}
                    flexDirection={{ base: 'column', sm: 'row' }}
                  >
                    <Button
                      bg="transparent"
                      color="primary.200"
                      _hover={{ bg: 'transparent' }}
                      fontSize={16}
                      fontWeight={700}
                      width={{ base: '100%', sm: '100px' }}
                      height="48px"
                      border="1px solid"
                      borderColor="primary.200"
                      borderRadius={8}
                      onClick={onClose}
                    >
                      Close
                    </Button>
                    <HStack spacing={4}>
                      {!isEditing && !duplicatingBlockId && (
                        <Button
                          colorScheme="orange"
                          bg="primary.200"
                          color="neutral.800"
                          _hover={{ bg: 'primary.200' }}
                          size="sm"
                          onClick={handleSave}
                          width={{ base: '100%', sm: '120px' }}
                          height="48px"
                          borderRadius={8}
                          isLoading={isLoading}
                          isDisabled={isLoading || hasValidationErrors}
                        >
                          Create block
                        </Button>
                      )}
                      {isEditing && (
                        <Button
                          colorScheme="orange"
                          bg="red.600"
                          color="neutral.0"
                          _hover={{ bg: 'red.600' }}
                          size="sm"
                          onClick={onShowDeleteConfirmation}
                          px={6}
                          height="48px"
                          borderRadius={8}
                          fontSize={16}
                          fontWeight={700}
                        >
                          Delete this availability block
                        </Button>
                      )}
                    </HStack>
                  </Flex>
                </VStack>
              </ModalBody>
            </>
          ) : (
            // Delete Confirmation Screen
            <>
              <ModalHeader color="neutral.0" pb={2}>
                <Text color="neutral.0" fontWeight={700} fontSize={22}>
                  Delete Availability Block
                </Text>
              </ModalHeader>

              <ModalBody pb={6} px={{ base: 4, md: 6 }}>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Text
                      color="neutral.0"
                      fontSize={20}
                      fontWeight={500}
                      mb={4}
                    >
                      You are about to delete the{' '}
                      <Text
                        as="span"
                        color="primary.200"
                        textDecoration="underline"
                      >
                        {currentEditingBlock?.title || 'working hours'}
                      </Text>{' '}
                      availability block
                    </Text>

                    <VStack align="start" spacing={2} mb={6}>
                      {currentEditingBlock &&
                        getFormattedSchedule(
                          currentEditingBlock.weekly_availability
                        ).map((schedule, index) => (
                          <Flex key={index} align="center" gap={1}>
                            <Text
                              color="neutral.300"
                              fontSize={16}
                              fontWeight={700}
                            >
                              {schedule.weekdays}
                            </Text>
                            <Text
                              color="neutral.300"
                              fontSize={16}
                              fontWeight={500}
                            >
                              : {schedule.timeRange}
                            </Text>
                          </Flex>
                        ))}

                      <Box
                        borderTop="1px solid"
                        borderColor="neutral.400"
                        width="100%"
                        my={3}
                      />

                      <Text color="neutral.300" fontSize={16} fontWeight={500}>
                        Timezone: {currentEditingBlock?.timezone}
                      </Text>
                    </VStack>

                    {/* Session types association section */}
                    <SessionTypesAssociationSection
                      blockId={currentEditingBlock?.id}
                      availableBlocks={availableBlocks}
                    />

                    <Text color="red.500" fontSize={16} fontWeight={500} mb={6}>
                      Deleting this availability block will affect your
                      availability in those groups and session types you have.
                    </Text>
                  </Box>

                  <Flex
                    justify="space-between"
                    align="center"
                    gap={4}
                    flexDirection={{ base: 'column', sm: 'row' }}
                  >
                    <Button
                      bg="primary.200"
                      color="neutral.800"
                      _hover={{ bg: 'primary.200' }}
                      onClick={onCancelDelete}
                      width={{ base: '100%', sm: '157px' }}
                      height="48px"
                      borderRadius={8}
                      fontSize={16}
                      fontWeight={700}
                    >
                      No, don&apos;t delete
                    </Button>
                    <Button
                      bg="transparent"
                      color="red.500"
                      border="1px solid"
                      borderColor="red.500"
                      _hover={{ bg: 'transparent' }}
                      onClick={onDelete}
                      width={{ base: '100%', sm: '84px' }}
                      height="48px"
                      borderRadius={8}
                      fontSize={16}
                      fontWeight={700}
                      isLoading={isLoading}
                    >
                      Delete
                    </Button>
                  </Flex>
                </VStack>
              </ModalBody>
            </>
          )}
        </Box>
      </ModalContent>
    </Modal>
  )
}

const SessionTypesAssociationSection: React.FC<{
  blockId?: string
  availableBlocks?: AvailabilityBlock[]
}> = ({ blockId, availableBlocks }) => {
  // Find the block and get its meeting types
  const block = availableBlocks?.find(b => b.id === blockId)
  const associatedMeetingTypes = block?.meetingTypes || []
  const validAssociatedMeetingTypes = associatedMeetingTypes.filter(
    type => type && type.title
  )

  if (!blockId) return null

  if (validAssociatedMeetingTypes.length === 0) return null

  return (
    <Box mb={4}>
      <Text color="neutral.0" fontSize={20} fontWeight={500} mt={6} mb={2}>
        Which is connected to these Session types
      </Text>
      <Text color="neutral.0" fontWeight={500} fontSize={16} mb={1}>
        Session types
      </Text>
      <VStack align="start" spacing={1} mb={2}>
        {validAssociatedMeetingTypes.map(type => (
          <Link
            key={type.id}
            color="primary.200"
            textDecoration="underline"
            fontSize={16}
            fontWeight={500}
            href={`/dashboard/meeting-settings?highlight=${type.id}`}
            isExternal
            target="_blank"
            rel="noopener noreferrer"
          >
            {type.title}
          </Link>
        ))}
      </VStack>
    </Box>
  )
}
