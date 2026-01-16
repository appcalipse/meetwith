import { useToast } from '@chakra-ui/react'

export const useToastHelpers = () => {
  const toast = useToast()

  const showSuccessToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      description,
      duration,
      isClosable: true,
      position: 'top',
      status: 'success',
      title,
    })
  }

  const showErrorToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      description,
      duration,
      isClosable: true,
      position: 'top',
      status: 'error',
      title,
    })
  }

  const showInfoToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      description,
      duration,
      isClosable: true,
      position: 'top',
      status: 'info',
      title,
    })
  }

  return {
    showErrorToast,
    showInfoToast,
    showSuccessToast,
  }
}
