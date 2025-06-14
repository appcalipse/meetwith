import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'

import TimezoneSelector from '@/components/TimezoneSelector'
import { TimeRange } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import { getFormattedSchedule } from '@/utils/availability.helper'

import { WeekdayConfig } from './weekday-config'

interface AvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  isEditing: boolean
  editingBlockId: string | null
  duplicatingBlockId: string | null
  showDeleteConfirmation: boolean
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
}

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  editingBlockId,
  duplicatingBlockId,
  showDeleteConfirmation,
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
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'xl' }}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="neutral.900"
        border="1px solid"
        borderRadius={{ base: 0, md: 12 }}
        borderColor="neutral.800"
        minHeight={{ base: '100%', md: '21rem' }}
        maxHeight={{ base: '100%', md: '38.75rem' }}
        overflowY="hidden"
        margin={{ base: 0, md: 4 }}
        width={{ base: '100%', md: 'calc(100% - 32px)' }}
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
          {!showDeleteConfirmation ? (
            <>
              <ModalHeader color="neutral.0" pb={2}>
                <Flex justify="space-between" align="center">
                  <Flex alignItems="flex-end" gap={2}>
                    <Text color="neutral.0" fontWeight={700} fontSize={22}>
                      {isEditing
                        ? 'Edit'
                        : duplicatingBlockId
                        ? 'Duplicate'
                        : 'New'}{' '}
                      Availability Block
                    </Text>
                  </Flex>
                  <Button
                    colorScheme="orange"
                    bg="primary.200"
                    color="neutral.800"
                    _hover={{ bg: 'primary.200' }}
                    size="sm"
                    onClick={onSave}
                    width={{ base: '60px', md: '70px' }}
                    height={{ base: '36px', md: '40px' }}
                    borderRadius={8}
                    isLoading={isLoading}
                    isDisabled={isLoading}
                  >
                    Save
                  </Button>
                </Flex>
                <HStack spacing={4} mt={5}>
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
              </ModalHeader>

              <ModalBody pb={6}>
                <VStack spacing={6} align="stretch">
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

                  <Box>
                    {formState.availabilities.map((availability, index) => (
                      <WeekdayConfig
                        key={`${
                          isEditing ? editingBlockId : 'new-block'
                        }-${index}`}
                        dayAvailability={availability}
                        onChange={onAvailabilityChange}
                      />
                    ))}
                  </Box>

                  <Flex justify="space-between" align="center" pt={4} gap={4}>
                    <Button
                      bg="transparent"
                      color="primary.200"
                      _hover={{ bg: 'transparent' }}
                      fontSize={16}
                      fontWeight={700}
                      width={{ base: '100%', md: '100px' }}
                      height="48px"
                      border="1px solid"
                      borderColor="primary.200"
                      borderRadius={8}
                      onClick={onClose}
                    >
                      Close
                    </Button>
                    {isEditing && (
                      <Button
                        colorScheme="orange"
                        bg="red.600"
                        color="neutral.0"
                        _hover={{ bg: 'red.600' }}
                        size="sm"
                        onClick={onShowDeleteConfirmation}
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
                  <Text color="neutral.0" fontSize={20} fontWeight={500} mb={4}>
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
                        currentEditingBlock.availabilities
                      ).map((line, index) => (
                        <Text
                          key={index}
                          color="neutral.300"
                          fontSize={16}
                          fontWeight={500}
                        >
                          {line}
                        </Text>
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

                  <Text color="red.500" fontSize={16} fontWeight={500} mb={6}>
                    Deleting this availability block will affect your
                    availability in groups and session types you have.
                  </Text>
                </Box>

                <Flex justify="space-between" align="center">
                  <Button
                    bg="primary.200"
                    color="neutral.800"
                    _hover={{ bg: 'primary.200' }}
                    onClick={onCancelDelete}
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
                    color="red.500"
                    border="1px solid"
                    borderColor="red.500"
                    _hover={{ bg: 'transparent' }}
                    onClick={onDelete}
                    width="84px"
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
            </Box>
          )}
        </Box>
      </ModalContent>
    </Modal>
  )
}
