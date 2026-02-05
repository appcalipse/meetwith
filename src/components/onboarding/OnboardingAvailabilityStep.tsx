import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Select as ChakraSelect } from 'chakra-react-select'
import { useState } from 'react'
import { MdKeyboard, MdMouse } from 'react-icons/md'

import TimezoneSelector from '@/components/TimezoneSelector'
import { useAllMeetingTypes } from '@/hooks/useAllMeetingTypes'
import { Account, TimeRange } from '@/types/Account'
import {
  handleCopyToDays,
  sortAvailabilitiesByWeekday,
} from '@/utils/availability.helper'
import { Option } from '@/utils/constants/select'

import { WeekdayConfig } from '../availabilities/WeekdayConfig'

interface OnboardingAvailabilityStepProps {
  formState: {
    title: string
    timezone: string | null | undefined
    availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
    isDefault: boolean
  }
  onTitleChange: (title: string) => void
  onTimezoneChange: (timezone: string | null | undefined) => void
  onAvailabilityChange: (day: number, ranges: TimeRange[] | null) => void
  onIsDefaultChange?: (isDefault: boolean) => void
  onMeetingTypesChange?: (meetingTypeIds: string[]) => void
  isLoading?: boolean
  currentAccount?: Account | null
}

export const OnboardingAvailabilityStep: React.FC<
  OnboardingAvailabilityStepProps
> = ({
  formState,
  onTitleChange,
  onTimezoneChange,
  onAvailabilityChange,
  onMeetingTypesChange,
}) => {
  const [isDirectInput, setIsDirectInput] = useState(false)
  const [_validationErrors, setValidationErrors] = useState<Set<number>>(
    new Set()
  )
  const [selectedMeetingTypes, setSelectedMeetingTypes] = useState<
    Option<string>[]
  >([])

  const { meetingTypes: allMeetingTypes, isLoading } = useAllMeetingTypes()

  const meetingTypeOptions: Option<string>[] = allMeetingTypes.map(type => ({
    value: type.id,
    label: type.title,
  }))

  const handleMeetingTypesChange = (selectedOptions: Option<string>[]) => {
    setSelectedMeetingTypes(selectedOptions)
    if (onMeetingTypesChange) {
      const meetingTypeIds = selectedOptions.map(option => option.value)
      onMeetingTypesChange(meetingTypeIds)
    }
  }

  const handleCopyToDaysLocal = (
    sourceWeekday: number,
    ranges: TimeRange[],
    copyType: 'all' | 'weekdays' | 'weekends'
  ) => {
    handleCopyToDays(
      sourceWeekday,
      ranges,
      copyType,
      formState.availabilities,
      onAvailabilityChange
    )
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

  const textColor = useColorModeValue('neutral.600', 'neutral.200')
  const bgColor = useColorModeValue('white', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const inputBgColor = useColorModeValue('white', 'gray.700')
  const placeholderColor = useColorModeValue('gray.400', 'gray.400')

  const toggleInputMode = () => {
    setIsDirectInput(!isDirectInput)
  }

  return (
    <VStack spacing={6} align="stretch">
      <FormControl>
        <FormLabel color={textColor} fontSize={15} fontWeight={500} mb={2}>
          Title
        </FormLabel>
        <Input
          placeholder="Enter availability block title"
          value={formState.title}
          onChange={e => onTitleChange(e.target.value)}
          bg={inputBgColor}
          border="1px solid"
          borderColor={borderColor}
          color={textColor}
          _placeholder={{ color: placeholderColor }}
          _focus={{
            borderColor: 'orange.400',
            boxShadow: '0 0 0 1px var(--chakra-colors-orange-400)',
          }}
        />
      </FormControl>

      <FormControl>
        <FormLabel color={textColor} fontSize={15} fontWeight={500} mb={2}>
          Timezone
        </FormLabel>
        <TimezoneSelector
          value={formState.timezone}
          onChange={onTimezoneChange}
        />
      </FormControl>

      <FormControl>
        <FormLabel color={textColor} fontSize={15} fontWeight={500} mb={2}>
          Associated Meeting Types
        </FormLabel>
        <ChakraSelect
          value={selectedMeetingTypes}
          onChange={(newValue: unknown) => {
            const newSelectedTypes = (newValue as Option<string>[]) || []
            handleMeetingTypesChange(newSelectedTypes)
          }}
          options={meetingTypeOptions}
          isMulti
          placeholder="Select meeting types to associate with this block..."
          isLoading={isLoading}
          chakraStyles={{
            control: provided => ({
              ...provided,
              background: inputBgColor,
              borderColor: borderColor,
              color: textColor,
            }),
          }}
        />
        <Text color={placeholderColor} fontSize={14} mt={2}>
          Select which meeting types should use this availability block.
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
          <Text color={textColor} fontSize={16} fontWeight={500}>
            Weekly Schedule
          </Text>
          <HStack spacing={2}>
            <Text color={placeholderColor} fontSize={14}>
              {isDirectInput ? 'Direct input mode' : 'Dropdown mode'}
            </Text>
            <Tooltip
              label={
                isDirectInput
                  ? 'Switch to dropdown mode'
                  : 'Switch to direct input mode'
              }
              placement="top"
              hasArrow
              bg={bgColor}
              color={textColor}
              borderRadius="md"
              fontSize="sm"
              px={3}
              py={2}
            >
              <IconButton
                color={placeholderColor}
                aria-label="toggle input mode"
                icon={
                  isDirectInput ? (
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
          {sortAvailabilitiesByWeekday(formState.availabilities).map(
            availability => (
              <WeekdayConfig
                key={`onboarding-${availability.weekday}`}
                dayAvailability={availability}
                onChange={onAvailabilityChange}
                onCopyToDays={handleCopyToDaysLocal}
                useDirectInput={isDirectInput}
                onValidationChange={handleValidationChange}
              />
            )
          )}
        </Box>
      </Box>
    </VStack>
  )
}
