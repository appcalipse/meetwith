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
    const newBlock = await createBlock.mutateAsync({
      title: formState.title,
      timezone: formState.timezone || 'Africa/Lagos',
      weekly_availability: formState.availabilities,
      is_default: formState.isDefault,
    })

    if (onMeetingTypesSave && newBlock?.id) {
      await onMeetingTypesSave(newBlock.id)
    }

    return newBlock
  }

  const updateExistingBlock = async (
    formState: FormState,
    editingBlockId: string
  ) => {
    await updateBlock.mutateAsync({
      id: editingBlockId,
      title: formState.title,
      timezone: formState.timezone || 'Africa/Lagos',
      weekly_availability: formState.availabilities,
      is_default: formState.isDefault,
    })

    if (onMeetingTypesSave && editingBlockId) {
      await onMeetingTypesSave(editingBlockId)
    }
  }

  const duplicateExistingBlock = async (
    formState: FormState,
    duplicatingBlockId: string
  ) => {
    const duplicatedBlock = await duplicateBlock.mutateAsync({
      id: duplicatingBlockId,
      modifiedData: {
        title: formState.title,
        timezone: formState.timezone || 'Africa/Lagos',
        weekly_availability: formState.availabilities,
        is_default: formState.isDefault,
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
    updateExistingBlock,
    duplicateExistingBlock,
    deleteExistingBlock,
  }
}
