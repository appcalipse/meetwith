import { AvailabilityBlock } from '@/types/availability'

interface UseAvailabilityBlockFormHandlersProps {
  resetForm: () => void
  setTitle: (title: string) => void
  setTimezone: (timezone: string | null | undefined) => void
  updateAvailability: (
    weekday: number,
    ranges: { start: string; end: string }[]
  ) => void
  setIsDefault: (isDefault: boolean) => void
}

export const useAvailabilityBlockFormHandlers = ({
  resetForm,
  setTitle,
  setTimezone,
  updateAvailability,
  setIsDefault,
}: UseAvailabilityBlockFormHandlersProps) => {
  const initializeFormForCreate = () => {
    resetForm()
  }

  const initializeFormForEdit = (block: AvailabilityBlock) => {
    setTitle(block.title)
    setTimezone(block.timezone)
    block.weekly_availability.forEach(availability => {
      updateAvailability(availability.weekday, availability.ranges)
    })
    setIsDefault(block.isDefault)
  }

  const initializeFormForDuplicate = (block: AvailabilityBlock) => {
    setTitle(`${block.title} (Copy)`)
    setTimezone(block.timezone)
    block.weekly_availability.forEach(availability => {
      updateAvailability(availability.weekday, availability.ranges)
    })
    setIsDefault(false)
  }

  return {
    initializeFormForCreate,
    initializeFormForDuplicate,
    initializeFormForEdit,
  }
}
