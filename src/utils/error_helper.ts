import { createStandaloneToast } from '@chakra-ui/react'

import { isJson } from '@/utils/generic_utils'

const { toast } = createStandaloneToast()

export const handleApiError = (title: string, error: Error) => {
  const isJsonErr = isJson(error.message)
  const errorMessage = isJsonErr
    ? JSON.parse(error.message)?.error || JSON.parse(error.message)?.name
    : error.message
  toast({
    title,
    description: errorMessage,
    status: 'error',
    duration: 5000,
    isClosable: true,
    position: 'top',
  })
}
