import { useToast } from '@chakra-ui/react'

export const useToastHelpers = () => {
  const toast = useToast()

  const showSuccessToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      title,
      description,
      status: 'success',
      duration,
      position: 'top',
      isClosable: true,
    })
  }

  const showErrorToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      title,
      description,
      status: 'error',
      duration,
      position: 'top',
      isClosable: true,
    })
  }

  const showInfoToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      title,
      description,
      status: 'info',
      duration,
      position: 'top',
      isClosable: true,
    })
  }

  return {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
  }
}
