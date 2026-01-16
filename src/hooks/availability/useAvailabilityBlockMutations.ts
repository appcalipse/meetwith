import { UseAvailabilityBlocksResult } from '@/types/availability'

interface FormState {
  title: string
  timezone: string | null | undefined
  availabilities: Array<{
    weekday: number
    ranges: { start: string; end: string }[]
  }>
  isDefault: boolean
}

interface UseAvailabilityBlockMutationsProps {
  createBlock: UseAvailabilityBlocksResult['createBlock']
  updateBlock: UseAvailabilityBlocksResult['updateBlock']
  deleteBlock: UseAvailabilityBlocksResult['deleteBlock']
  duplicateBlock: UseAvailabilityBlocksResult['duplicateBlock']
  onMeetingTypesSave?: (blockId: string) => Promise<void>
}

export const useAvailabilityBlockMutations = ({
  createBlock,
  updateBlock,
  deleteBlock,
  duplicateBlock,
  onMeetingTypesSave,
}: UseAvailabilityBlockMutationsProps) => {
  const createNewBlock = async (formState: FormState) => {
    try {
      const newBlock = await createBlock.mutateAsync({
        is_default: formState.isDefault,
        timezone: formState.timezone || 'Africa/Lagos',
        title: formState.title,
        weekly_availability: formState.availabilities,
      })

      if (onMeetingTypesSave && newBlock?.id) {
        await onMeetingTypesSave(newBlock.id)
      }

      return newBlock
    } catch (error: unknown) {
      throw error
    }
  }

  const updateExistingBlock = async (
    formState: FormState,
    editingBlockId: string
  ) => {
    try {
      await updateBlock.mutateAsync({
        id: editingBlockId,
        is_default: formState.isDefault,
        timezone: formState.timezone || 'Africa/Lagos',
        title: formState.title,
        weekly_availability: formState.availabilities,
      })

      if (onMeetingTypesSave && editingBlockId) {
        await onMeetingTypesSave(editingBlockId)
      }
    } catch (error: unknown) {
      throw error
    }
  }

  const duplicateExistingBlock = async (
    formState: FormState,
    duplicatingBlockId: string
  ) => {
    const duplicatedBlock = await duplicateBlock.mutateAsync({
      id: duplicatingBlockId,
      modifiedData: {
        is_default: formState.isDefault,
        timezone: formState.timezone || 'Africa/Lagos',
        title: formState.title,
        weekly_availability: formState.availabilities,
      },
    })

    if (onMeetingTypesSave && duplicatedBlock?.id) {
      await onMeetingTypesSave(duplicatedBlock.id)
    }

    return duplicatedBlock
  }

  const deleteExistingBlock = async (editingBlockId: string) => {
    await deleteBlock.mutateAsync(editingBlockId)
  }

  return {
    createNewBlock,
    deleteExistingBlock,
    duplicateExistingBlock,
    updateExistingBlock,
  }
}
