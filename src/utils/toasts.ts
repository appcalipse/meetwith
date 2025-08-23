import { useToast } from '@chakra-ui/react'

export const useToastHelpers = () => {
  const toast = useToast()

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

  const showInfoToast = (title: string, description: string) => {
    toast({
      title,
      description,
      status: 'info',
      duration: 3000,
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
