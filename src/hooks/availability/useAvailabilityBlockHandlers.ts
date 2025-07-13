import {
  AvailabilityBlock,
  UseAvailabilityBlocksResult,
} from '@/types/availability'

import { useAvailabilityBlockFormHandlers } from './useAvailabilityBlockFormHandlers'
import { useAvailabilityBlockMutations } from './useAvailabilityBlockMutations'
import { useAvailabilityBlockUIState } from './useAvailabilityBlockUIState'
import { useAvailabilityBlockValidation } from './useAvailabilityBlockValidation'

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
  onMeetingTypesSave?: (blockId: string) => Promise<void>
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
  onMeetingTypesSave,
}: UseAvailabilityBlockHandlersProps) => {
  // UI State Management
  const {
    isEditing,
    editingBlockId,
    duplicatingBlockId,
    showDeleteConfirmation,
    isSaving,
    setIsSaving,
    resetUIState,
    setEditingState,
    setDuplicatingState,
    setCreateState,
    setShowDeleteConfirmation,
  } = useAvailabilityBlockUIState()

  // Validation and Toast Management
  const {
    validateForm,
    showSuccessToast,
    showErrorToast,
    showDeleteErrorToast,
  } = useAvailabilityBlockValidation()

  // Mutation Operations
  const {
    createNewBlock,
    updateExistingBlock,
    duplicateExistingBlock,
    deleteExistingBlock,
  } = useAvailabilityBlockMutations({
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    onMeetingTypesSave,
  })

  // Form Handlers
  const {
    initializeFormForCreate,
    initializeFormForEdit,
    initializeFormForDuplicate,
  } = useAvailabilityBlockFormHandlers({
    resetForm,
    setTitle,
    setTimezone,
    updateAvailability,
    setIsDefault,
  })

  const handleCreateBlock = () => {
    initializeFormForCreate()
    setCreateState()
    onOpen()
  }

  const handleEditBlock = (block: AvailabilityBlock) => {
    initializeFormForEdit(block)
    setEditingState(block.id)
    onOpen()
  }

  const handleDuplicateBlock = (block: AvailabilityBlock) => {
    initializeFormForDuplicate(block)
    setDuplicatingState(block.id)
    onOpen()
  }

  const handleClose = () => {
    onClose()
    resetForm()
    resetUIState()
  }

  const handleSaveNewBlock = async () => {
    if (!validateForm(formState)) {
      return
    }

    setIsSaving(true)

    try {
      if (isEditing && editingBlockId) {
        await updateExistingBlock(formState, editingBlockId)
        showSuccessToast(
          'Availability block updated',
          `${formState.title} has been updated successfully.`
        )
        handleClose()
      } else if (duplicatingBlockId) {
        const duplicatedBlock = await duplicateExistingBlock(
          formState,
          duplicatingBlockId
        )
        showSuccessToast(
          'Availability block duplicated',
          `${duplicatedBlock.title} has been created successfully.`
        )
        handleClose()
      } else {
        await createNewBlock(formState)
        showSuccessToast(
          'Availability block created',
          `${formState.title} has been created successfully.`
        )
        handleClose()
      }
    } catch (error) {
      showErrorToast(
        'Error',
        'Failed to save availability block. Please try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteBlock = async () => {
    if (editingBlockId) {
      try {
        await deleteExistingBlock(editingBlockId)
        showSuccessToast(
          'Availability block deleted',
          'The availability block has been deleted successfully.'
        )
        onClose()
      } catch (error: unknown) {
        showDeleteErrorToast(error)
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
    isSaving,
    handleCreateBlock,
    handleEditBlock,
    handleDuplicateBlock,
    handleSaveNewBlock,
    handleDeleteBlock,
    handleShowDeleteConfirmation,
    handleCancelDelete,
  }
}
