import { useToast } from '@chakra-ui/react'

import { validateAvailabilityBlock } from '@/utils/availability.helper'

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
  const toast = useToast()

  const validateForm = (formState: FormState): boolean => {
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
      return false
    }

    return true
  }

  const showSuccessToast = (title: string, description: string) => {
    toast({
      title,
      description,
      status: 'success',
      duration: 3000,
      position: 'top',
      isClosable: true,
    })
  }

  const showErrorToast = (title: string, description: string) => {
    toast({
      title,
      description,
      status: 'error',
      duration: 3000,
      position: 'top',
      isClosable: true,
    })
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
    validateForm,
    showSuccessToast,
    showErrorToast,
    showDeleteErrorToast,
  }
}
