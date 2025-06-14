import { AddIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'

import { useAvailabilityBlocks } from '@/hooks/useAvailabilityBlocks'
import { useAvailabilityForm } from '@/hooks/useAvailabilityForm'
import { Account } from '@/types/Account'
import {
  AvailabilityBlock,
  UseAvailabilityBlocksResult,
} from '@/types/availability'
import { validateAvailabilityBlock } from '@/utils/availability.helper'

import { AvailabilityBlockCard } from './availability-block-card'
import { AvailabilityEmptyState } from './availability-empty-state'
import { AvailabilityModal } from './availability-modal'

const AvailabilityConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const {
    blocks: availabilityBlocks,
    isLoading,
    isFetching,
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  } = useAvailabilityBlocks(
    currentAccount?.address
  ) as UseAvailabilityBlocksResult

  const {
    formState,
    resetForm,
    updateAvailability,
    setTitle,
    setTimezone,
    setIsDefault,
  } = useAvailabilityForm(currentAccount)

  const [isEditing, setIsEditing] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [duplicatingBlockId, setDuplicatingBlockId] = useState<string | null>(
    null
  )

  const handleCreateBlock = () => {
    resetForm()
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(null)
    setShowDeleteConfirmation(false)
    onOpen()
  }

  const handleEditBlock = (block: AvailabilityBlock) => {
    setTitle(block.title)
    setTimezone(block.timezone)
    block.availabilities.forEach(availability => {
      updateAvailability(availability.weekday, availability.ranges)
    })
    setIsDefault(block.isDefault)
    setIsEditing(true)
    setEditingBlockId(block.id)
    setShowDeleteConfirmation(false)
    onOpen()
  }

  const handleDuplicateBlock = async (block: AvailabilityBlock) => {
    setTitle(`${block.title} (Copy)`)
    setTimezone(block.timezone)
    block.availabilities.forEach(availability => {
      updateAvailability(availability.weekday, availability.ranges)
    })
    setIsDefault(false)
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(block.id)
    setShowDeleteConfirmation(false)
    onOpen()
  }

  const handleClose = () => {
    resetForm()
    setIsEditing(false)
    setEditingBlockId(null)
    setDuplicatingBlockId(null)
    setShowDeleteConfirmation(false)
    onClose()
  }

  const handleSaveNewBlock = async () => {
    const validation = validateAvailabilityBlock(
      formState.title,
      formState.availabilities
    )

    if (!validation.isValid) {
      toast({
        title: validation.error,
        description:
          validation.error === 'Title required'
            ? 'Please enter a title for your availability block.'
            : 'Please add at least one availability time slot.',
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
          title: formState.title,
          timezone: formState.timezone || 'Africa/Lagos',
          weekly_availability: formState.availabilities,
          is_default: formState.isDefault,
        })

        toast({
          title: 'Availability block updated',
          description: `${formState.title} has been updated successfully.`,
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      } else if (duplicatingBlockId) {
        const duplicatedBlock = await duplicateBlock.mutateAsync({
          id: duplicatingBlockId,
          modifiedData: {
            title: formState.title,
            timezone: formState.timezone || 'Africa/Lagos',
            weekly_availability: formState.availabilities,
            is_default: formState.isDefault,
          },
        })

        toast({
          title: 'Availability block duplicated',
          description: `${duplicatedBlock.title} has been created successfully.`,
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      } else {
        await createBlock.mutateAsync({
          title: formState.title,
          timezone: formState.timezone || 'Africa/Lagos',
          weekly_availability: formState.availabilities,
          is_default: formState.isDefault,
        })

        toast({
          title: 'Availability block created',
          description: `${formState.title} has been created successfully.`,
          status: 'success',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      }

      handleClose()
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
        handleClose()
      } catch (error: any) {
        toast({
          title: 'Error',
          description:
            error.message ||
            'Failed to delete availability block. Please try again.',
          status: 'error',
          duration: 3000,
          position: 'top',
          isClosable: true,
        })
      }
    }
  }

  const handleShowDeleteConfirmation = () => {
    setShowDeleteConfirmation(true)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
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
      <Heading fontSize="2xl" color="neutral.0">
        My Availability
      </Heading>

      <Box
        width={{ base: '100%', md: '100%', lg: 880 }}
        maxHeight={{ base: '100%', md: '100%', lg: 860 }}
        overflowY="auto"
        padding={{ base: 4, md: 6, lg: 8 }}
        borderRadius={12}
        background="neutral.900"
        position="relative"
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
        {isFetching && (
          <Flex
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            justify="center"
            align="center"
            bg="rgba(20, 26, 31, 0.8)"
            zIndex={1}
            borderRadius={12}
          >
            <Spinner size="xl" color="orange.500" />
          </Flex>
        )}
        <Flex
          align="flex-start"
          justify="space-between"
          mb={4}
          flexDirection={{ base: 'column', md: 'row' }}
          gap={{ base: 4, md: 0 }}
        >
          <Box width={{ base: '100%', md: 533 }}>
            <Heading fontSize={{ base: 18, md: 22 }} color="neutral.0" mb={2}>
              Availability blocks
            </Heading>
            <Text color="neutral.0" fontSize={{ base: 14, md: 16 }}>
              Define when you&apos;re free to meet. Different{' '}
              <Text as="span" color="primary.200" textDecoration="underline">
                groups
              </Text>{' '}
              and{' '}
              <Text as="span" color="primary.200" textDecoration="underline">
                session types
              </Text>{' '}
              can use different availability blocks.
            </Text>
          </Box>
          <Button
            leftIcon={<AddIcon color="neutral.800" />}
            colorScheme="orange"
            bg="primary.200"
            color="neutral.800"
            _hover={{ bg: 'primary.200' }}
            onClick={handleCreateBlock}
            fontSize="sm"
            px={6}
          >
            New Availability block
          </Button>
        </Flex>

        <Flex flexDirection="column" gap={6} flexWrap="wrap" mt={7}>
          {availabilityBlocks?.length === 0 ? (
            <AvailabilityEmptyState onCreateBlock={handleCreateBlock} />
          ) : (
            availabilityBlocks?.map(block => (
              <AvailabilityBlockCard
                key={block.id}
                block={block}
                onEdit={handleEditBlock}
                onDuplicate={handleDuplicateBlock}
              />
            ))
          )}
        </Flex>
      </Box>

      <AvailabilityModal
        isOpen={isOpen}
        onClose={handleClose}
        isEditing={isEditing}
        editingBlockId={editingBlockId}
        duplicatingBlockId={duplicatingBlockId}
        showDeleteConfirmation={showDeleteConfirmation}
        formState={formState}
        onTitleChange={setTitle}
        onTimezoneChange={setTimezone}
        onAvailabilityChange={updateAvailability}
        onIsDefaultChange={setIsDefault}
        onSave={handleSaveNewBlock}
        onDelete={handleDeleteBlock}
        onCancelDelete={handleCancelDelete}
        onShowDeleteConfirmation={handleShowDeleteConfirmation}
        isLoading={
          createBlock.isLoading ||
          updateBlock.isLoading ||
          duplicateBlock.isLoading ||
          deleteBlock.isLoading
        }
        currentEditingBlock={availabilityBlocks?.find(
          block => block.id === editingBlockId
        )}
      />
    </VStack>
  )
}

export default AvailabilityConfig
