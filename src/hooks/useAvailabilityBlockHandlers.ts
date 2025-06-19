import { useToast } from '@chakra-ui/react'
import { useState } from 'react'

import { AvailabilityBlock } from '@/types/availability'
import { UseAvailabilityBlocksResult } from '@/types/availability'
import { validateAvailabilityBlock } from '@/utils/availability.helper'

interface UseAvailabilityBlockHandlersProps {
  createBlock: UseAvailabilityBlocksResult['createBlock']
  updateBlock: UseAvailabilityBlocksResult['updateBlock']
  deleteBlock: UseAvailabilityBlocksResult['deleteBlock']
  duplicateBlock: UseAvailabilityBlocksResult['duplicateBlock']
  formState: {
    title: string
    timezone: string | null | undefined
    availabilities: Array<{
      weekday: number
      ranges: { start: string; end: string }[]
    }>
    isDefault: boolean
  }
  resetForm: () => void
  setTitle: (title: string) => void
  setTimezone: (timezone: string | null | undefined) => void
  updateAvailability: (
    weekday: number,
    ranges: { start: string; end: string }[]
  ) => void
  setIsDefault: (isDefault: boolean) => void
  onOpen: () => void
  onClose: () => void
}

export const useAvailabilityBlockHandlers = ({
  createBlock,
  updateBlock,
  deleteBlock,
  duplicateBlock,
  formState,
  resetForm,
  setTitle,
  setTimezone,
  updateAvailability,
  setIsDefault,
  onOpen,
  onClose,
}: UseAvailabilityBlockHandlersProps) => {
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [duplicatingBlockId, setDuplicatingBlockId] = useState<string | null>(
    null
  )
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

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

  const handleDuplicateBlock = (block: AvailabilityBlock) => {
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
        let errorMessage =
          'Failed to delete availability block. Please try again.'

        if (error instanceof Error) {
          try {
            const parsedError = JSON.parse(error.message)
            errorMessage = parsedError.error || error.message
          } catch {
            errorMessage = error.message
          }
        }

        if (errorMessage === 'Cannot delete the default availability block') {
          errorMessage =
            'Cannot delete the default availability block. Please set another block as default first.'
        } else if (errorMessage === 'Availability block not found') {
          errorMessage =
            'The availability block could not be found. It may have been already deleted.'
        }

        toast({
          title: 'Error',
          description: errorMessage,
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

  return {
    isEditing,
    editingBlockId,
    duplicatingBlockId,
    showDeleteConfirmation,
    handleCreateBlock,
    handleEditBlock,
    handleDuplicateBlock,
    handleClose,
    handleSaveNewBlock,
    handleDeleteBlock,
    handleShowDeleteConfirmation,
    handleCancelDelete,
  }
}
