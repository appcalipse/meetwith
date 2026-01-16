import {
  AvailabilityBlock,
  UseAvailabilityBlocksResult,
} from '@/types/availability'
import { useToastHelpers } from '@/utils/toasts'

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
  existingBlocks?: AvailabilityBlock[]
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
  existingBlocks,
}: UseAvailabilityBlockHandlersProps) => {
  // UI State Management
  const {
    isEditing,
    editingBlockId,
    duplicatingBlockId,
    showDeleteConfirmation,
    showSelectDefaultModal,
    selectDefaultModalConfig,
    isSaving,
    setIsSaving,
    resetUIState,
    setEditingState,
    setDuplicatingState,
    setCreateState,
    setShowDeleteConfirmation,
    setShowSelectDefaultModal,
    setSelectDefaultModalConfig,
  } = useAvailabilityBlockUIState()

  // Validation and Toast Management
  const { validateForm, showDeleteErrorToast } =
    useAvailabilityBlockValidation()
  const { showSuccessToast, showErrorToast } = useToastHelpers()

  // Mutation Operations
  const {
    createNewBlock,
    updateExistingBlock,
    duplicateExistingBlock,
    deleteExistingBlock,
  } = useAvailabilityBlockMutations({
    createBlock,
    deleteBlock,
    duplicateBlock,
    onMeetingTypesSave,
    updateBlock,
  })

  // Form Handlers
  const {
    initializeFormForCreate,
    initializeFormForEdit,
    initializeFormForDuplicate,
  } = useAvailabilityBlockFormHandlers({
    resetForm,
    setIsDefault,
    setTimezone,
    setTitle,
    updateAvailability,
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
        // Check if we're unsetting a default block
        const currentBlock = existingBlocks?.find(
          block => block.id === editingBlockId
        )
        const isCurrentlyDefault = currentBlock?.isDefault
        const isUnsettingDefault = isCurrentlyDefault && !formState.isDefault

        if (isUnsettingDefault) {
          // Show modal to select new default
          handleShowSelectDefaultModal(
            'Select New Default Availability',
            'You cannot unset the default availability block. Please select a new default availability block first.',
            'Set as Default',
            async (selectedBlockId: string) => {
              try {
                setIsSaving(true)
                // Get the selected block data
                const selectedBlock = existingBlocks?.find(
                  block => block.id === selectedBlockId
                )
                if (!selectedBlock) {
                  throw new Error('Selected block not found')
                }

                // First set the selected block as default
                await updateBlock.mutateAsync({
                  id: selectedBlockId,
                  is_default: true,
                  timezone: selectedBlock.timezone,
                  title: selectedBlock.title,
                  weekly_availability: selectedBlock.weekly_availability,
                })
                // Then update the original block
                await updateExistingBlock(formState, editingBlockId)
                showSuccessToast(
                  'Availability block updated',
                  `${formState.title} has been updated successfully.`
                )
                handleClose()
              } catch (_updateError: unknown) {
                showErrorToast(
                  'Error',
                  'Failed to update default availability block.'
                )
              } finally {
                setIsSaving(false)
              }
            }
          )
          return
        }

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        try {
          const parsedError = JSON.parse(error.message)
          const errorMessage = parsedError.error || error.message
          showErrorToast('Error', errorMessage)
        } catch {
          showErrorToast('Error', error.message)
        }
      } else {
        showErrorToast(
          'Error',
          'Failed to save availability block. Please try again.'
        )
      }
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
        handleClose()
      } catch (error: unknown) {
        // Check if it's a default block deletion error
        if (error instanceof Error) {
          try {
            const parsed = JSON.parse(error.message)
            if (
              parsed.error === 'Cannot delete the default availability block'
            ) {
              // Show modal to select new default
              handleShowSelectDefaultModal(
                'Select New Default Availability',
                'You cannot delete the default availability block. Please select a new default availability block first.',
                'Set as Default & Delete',
                async (selectedBlockId: string) => {
                  try {
                    setIsSaving(true)
                    // Get the selected block data
                    const selectedBlock = existingBlocks?.find(
                      block => block.id === selectedBlockId
                    )
                    if (!selectedBlock) {
                      throw new Error('Selected block not found')
                    }

                    // First set the selected block as default
                    await updateBlock.mutateAsync({
                      id: selectedBlockId,
                      is_default: true,
                      timezone: selectedBlock.timezone,
                      title: selectedBlock.title,
                      weekly_availability: selectedBlock.weekly_availability,
                    })
                    // Then delete the original block
                    await deleteExistingBlock(editingBlockId)
                    showSuccessToast(
                      'Availability block deleted',
                      'The availability block has been deleted successfully.'
                    )
                    handleClose()
                  } catch (_updateError: unknown) {
                    showErrorToast(
                      'Error',
                      'Failed to update default availability block.'
                    )
                  } finally {
                    setIsSaving(false)
                  }
                }
              )
              return
            }
          } catch {
            showErrorToast(
              'Error',
              'Failed to delete availability block. Please try again.'
            )
          }
        }
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

  const handleShowSelectDefaultModal = (
    title: string,
    description: string,
    confirmButtonText: string,
    onConfirm: (selectedBlockId: string) => void
  ) => {
    setSelectDefaultModalConfig({
      confirmButtonText,
      description,
      onConfirm,
      title,
    })
    setShowSelectDefaultModal(true)
  }

  const handleCloseSelectDefaultModal = () => {
    setShowSelectDefaultModal(false)
    setSelectDefaultModalConfig(null)
  }

  return {
    duplicatingBlockId,
    editingBlockId,
    handleCancelDelete,
    handleClose,
    handleCloseSelectDefaultModal,
    handleCreateBlock,
    handleDeleteBlock,
    handleDuplicateBlock,
    handleEditBlock,
    handleSaveNewBlock,
    handleShowDeleteConfirmation,
    handleShowSelectDefaultModal,
    isEditing,
    isSaving,
    selectDefaultModalConfig,
    showDeleteConfirmation,
    showSelectDefaultModal,
  }
}
