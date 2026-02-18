import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import { Select as ChakraSelect } from 'chakra-react-select'
import { useEffect, useRef, useState } from 'react'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { MdKeyboard, MdMouse } from 'react-icons/md'

import TimezoneSelector from '@/components/TimezoneSelector'
import { TimeRange } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import { PollCustomAvailability } from '@/types/QuickPoll'
import {
  findMatchingAvailabilityBlocks,
  getBrowserTimezone,
  initializeEmptyAvailabilities,
  mergeWeeklyAvailabilityFromBlocks,
  sortAvailabilitiesByWeekday,
} from '@/utils/availability.helper'
import { Option } from '@/utils/constants/select'

import { WeekdayConfig } from './WeekdayConfig'

export type PollAvailabilityResult =
  | { type: 'blocks'; blockIds: string[] }
  | { type: 'custom'; custom: PollCustomAvailability }

interface PollAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (result: PollAvailabilityResult) => void | Promise<void>
  availableBlocks: AvailabilityBlock[]
  defaultBlockId: string | null
  /** Initial selection when opening: either block ids or custom config. */
  initialBlockIds: string[]
  initialCustom: PollCustomAvailability | null
}

export function PollAvailabilityModal({
  isOpen,
  onClose,
  onSave,
  availableBlocks,
  defaultBlockId,
  initialBlockIds,
  initialCustom,
}: PollAvailabilityModalProps) {
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const [timezone, setTimezone] = useState<string>(getBrowserTimezone())
  const [availabilities, setAvailabilities] = useState<
    Array<{ weekday: number; ranges: TimeRange[] }>
  >(initializeEmptyAvailabilities())
  const [useDirectInput, setUseDirectInput] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Set<number>>(
    new Set()
  )
  const hasInitialized = useRef(false)

  const defaultBlock = defaultBlockId
    ? availableBlocks.find(b => b.id === defaultBlockId)
    : availableBlocks.find(b => b.isDefault) ?? availableBlocks[0]

  // Initialize from props when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (hasInitialized.current) return
    hasInitialized.current = true

    if (initialCustom) {
      setTimezone(initialCustom.timezone)
      const fromCustom = (initialCustom.weekly_availability || []).map(a => ({
        weekday: a.weekday,
        ranges: (a.ranges || []).map(r => ({
          start: r.start,
          end: r.end,
        })),
      }))
      const empty = initializeEmptyAvailabilities()
      const merged = empty.map(e => {
        const found = fromCustom.find(f => f.weekday === e.weekday)
        return found
          ? { weekday: e.weekday, ranges: found.ranges }
          : { weekday: e.weekday, ranges: [] }
      })
      setAvailabilities(merged)
      setSelectedBlockIds([])
      return
    }
    if (initialBlockIds.length > 0) {
      const blocks = availableBlocks.filter(b => initialBlockIds.includes(b.id))
      setSelectedBlockIds(initialBlockIds)
      if (blocks.length > 0) {
        setTimezone(blocks[0].timezone)
        setAvailabilities(mergeWeeklyAvailabilityFromBlocks(blocks))
      } else {
        setAvailabilities(initializeEmptyAvailabilities())
      }
      return
    }
    // Default: use default block
    if (defaultBlock) {
      setSelectedBlockIds([defaultBlock.id])
      setTimezone(defaultBlock.timezone)
      setAvailabilities(
        sortAvailabilitiesByWeekday(
          (defaultBlock.weekly_availability || []).map(a => ({
            weekday: a.weekday,
            ranges: a.ranges || [],
          }))
        )
      )
    } else {
      setTimezone(getBrowserTimezone())
      setAvailabilities(initializeEmptyAvailabilities())
    }
  }, [isOpen, initialBlockIds, initialCustom, availableBlocks, defaultBlock])

  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false
    }
  }, [isOpen])

  // When user changes selected blocks from dropdown, update schedule and timezone from blocks
  const handleBlockSelectionChange = (options: Option<string>[]) => {
    const ids = options.map(o => o.value)
    setSelectedBlockIds(ids)
    if (ids.length > 0) {
      const blocks = availableBlocks.filter(b => ids.includes(b.id))
      if (blocks.length > 0) {
        setTimezone(blocks[0].timezone)
        setAvailabilities(mergeWeeklyAvailabilityFromBlocks(blocks))
      }
    }
  }

  const handleTimezoneChange = (tz: string | null | undefined) => {
    setTimezone(tz ?? getBrowserTimezone())
  }

  const handleAvailabilityChange = (
    day: number,
    ranges: TimeRange[] | null
  ) => {
    setAvailabilities(prev =>
      prev.map(a =>
        a.weekday === day ? { weekday: day, ranges: ranges ?? [] } : a
      )
    )
  }

  const handleValidationChange = (weekday: number, isValid: boolean) => {
    setValidationErrors(prev => {
      const next = new Set(prev)
      if (isValid) next.delete(weekday)
      else next.add(weekday)
      return next
    })
  }

  const handleCopyToDays = (
    sourceWeekday: number,
    ranges: TimeRange[],
    copyType: 'all' | 'weekdays' | 'weekends'
  ) => {
    const targetWeekdays: number[] =
      copyType === 'all'
        ? availabilities.map(a => a.weekday).filter(w => w !== sourceWeekday)
        : copyType === 'weekdays'
        ? [1, 2, 3, 4, 5]
        : [0, 6]
    targetWeekdays.forEach(w => handleAvailabilityChange(w, [...ranges]))
  }

  const [isSaving, setIsSaving] = useState(false)
  const hasValidationErrors = validationErrors.size > 0
  const toggleInputMode = () => setUseDirectInput(prev => !prev)

  const handleSave = async () => {
    let result: PollAvailabilityResult
    if (selectedBlockIds.length > 0) {
      result = { type: 'blocks', blockIds: selectedBlockIds }
    } else {
      const matchingBlocks = findMatchingAvailabilityBlocks(
        availableBlocks,
        timezone,
        availabilities
      )
      result =
        matchingBlocks.length > 0
          ? { type: 'blocks', blockIds: matchingBlocks.map(b => b.id) }
          : {
              type: 'custom',
              custom: {
                timezone,
                weekly_availability: availabilities.map(a => ({
                  weekday: a.weekday,
                  ranges: a.ranges.map(r => ({
                    start: r.start || '',
                    end: r.end || '',
                  })),
                })),
              },
            }
    }
    setIsSaving(true)
    try {
      await Promise.resolve(onSave(result))
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const blockOptions: Option<string>[] = (availableBlocks || []).map(b => ({
    value: b.id,
    label: b.title,
  }))
  const selectedBlockOptions = blockOptions.filter(o =>
    selectedBlockIds.includes(o.value)
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="bg-surface"
        border="1px solid"
        borderRadius={{ base: 0, md: 12 }}
        borderColor="border-wallet-subtle"
        minHeight={{ base: '100%', md: '21rem' }}
        maxHeight={{ base: '100%', md: '90vh' }}
        minWidth={{ base: '100%', md: '600px' }}
        overflowY="hidden"
        margin={{ base: 0, md: 4 }}
        width={{ base: '800px', md: 'auto' }}
        shadow="none"
        boxShadow="none"
      >
        <Box
          overflowY="auto"
          px={{ base: 0, md: 2 }}
          sx={{
            scrollbarGutter: 'stable both-edges',
            '&::-webkit-scrollbar': { width: '6px', background: 'transparent' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: 'transparent',
              borderRadius: '3px',
            },
            '&:hover::-webkit-scrollbar-thumb': {
              background: 'bg-surface-tertiary',
            },
          }}
        >
          <ModalHeader color="text-primary" pb={2}>
            <Text color="text-primary" fontWeight={700} fontSize={22}>
              Select availability for poll
            </Text>
            <Text color="text-secondary" fontSize={14} fontWeight={400} mt={1}>
              Pick one or more availability blocks or customize the schedule
              below.
            </Text>
          </ModalHeader>

          <ModalBody pb={6} px={{ base: 4, md: 6 }}>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel
                  color="text-primary"
                  fontSize={15}
                  fontWeight={500}
                  mb={2}
                >
                  Availability blocks
                </FormLabel>
                <ChakraSelect<Option<string>, true>
                  value={selectedBlockOptions}
                  onChange={(newVal: unknown) => {
                    const opts = (newVal as Option<string>[]) || []
                    handleBlockSelectionChange(opts)
                  }}
                  options={blockOptions}
                  isMulti
                  placeholder="Select blocks..."
                  chakraStyles={{
                    control: provided => ({
                      ...provided,
                      background: 'bg-surface',
                      borderColor: 'border-default',
                      color: 'text-primary',
                    }),
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel
                  color="text-primary"
                  fontSize={15}
                  fontWeight={500}
                  mb={2}
                >
                  Timezone
                </FormLabel>
                <TimezoneSelector
                  value={timezone}
                  onChange={handleTimezoneChange}
                />
              </FormControl>

              <Box>
                <Flex
                  justify="space-between"
                  align="center"
                  mb={4}
                  flexDirection={{ base: 'column', sm: 'row' }}
                  gap={2}
                >
                  <Text color="text-primary" fontSize={16} fontWeight={500}>
                    Schedule
                  </Text>
                  <HStack spacing={2}>
                    <Text color="text-secondary" fontSize={14}>
                      {useDirectInput ? 'Direct input mode' : 'Dropdown mode'}
                    </Text>
                    <Tooltip
                      label={
                        useDirectInput
                          ? 'Switch to dropdown mode'
                          : 'Switch to direct input mode'
                      }
                      placement="top"
                      hasArrow
                      bg="bg-surface-tertiary"
                      color="text-primary"
                      borderRadius="md"
                      fontSize="sm"
                      px={3}
                      py={2}
                    >
                      <IconButton
                        color="text-secondary"
                        aria-label="toggle input mode"
                        icon={
                          useDirectInput ? (
                            <MdKeyboard size={16} />
                          ) : (
                            <MdMouse size={16} />
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
                  {sortAvailabilitiesByWeekday([...availabilities]).map(
                    availability => (
                      <WeekdayConfig
                        key={`poll-avail-${availability.weekday}`}
                        dayAvailability={availability}
                        onChange={handleAvailabilityChange}
                        onCopyToDays={handleCopyToDays}
                        useDirectInput={useDirectInput}
                        onValidationChange={handleValidationChange}
                      />
                    )
                  )}
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
                  isDisabled={isSaving}
                >
                  Cancel
                </Button>
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
                  fontSize={16}
                  fontWeight={700}
                  isDisabled={hasValidationErrors || isSaving}
                  isLoading={isSaving}
                  loadingText="Saving..."
                >
                  Save
                </Button>
              </Flex>
            </VStack>
          </ModalBody>
        </Box>
      </ModalContent>
    </Modal>
  )
}
