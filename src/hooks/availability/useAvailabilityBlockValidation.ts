import { validateAvailabilityBlock } from '@/utils/availability.helper'
import { useToastHelpers } from '@/utils/toasts'

interface FormState {
  title: string
  timezone: string | null | undefined
  availabilities: Array<{
    weekday: number
    ranges: { start: string; end: string }[]
  }>
  isDefault: boolean
}

export const useAvailabilityBlockValidation = () => {
  const { showErrorToast } = useToastHelpers()

  const validateForm = (formState: FormState): boolean => {
    const validation = validateAvailabilityBlock(
      formState.title,
      formState.availabilities
    )

    if (!validation.isValid) {
      showErrorToast(
        validation.error || 'Validation Error',
        validation.error === 'Title required'
          ? 'Please enter a title for your availability block.'
          : 'Please add at least one availability time slot.'
      )
      return false
    }

    return true
  }

  const showDeleteErrorToast = (error: unknown) => {
    let errorMessage = 'Failed to delete availability block. Please try again.'

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

    showErrorToast('Error', errorMessage)
  }

  return {
    showDeleteErrorToast,
    validateForm,
  }
}
