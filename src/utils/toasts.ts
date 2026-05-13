import { useToast } from '@chakra-ui/react'

import { translateText } from '@/i18n'
import { useI18n } from '@/i18n/I18nProvider'

export const useToastHelpers = () => {
  const toast = useToast()
  const { locale } = useI18n()

  const showSuccessToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      description: translateText(locale, description),
      duration,
      isClosable: true,
      position: 'top',
      status: 'success',
      title: translateText(locale, title),
    })
  }

  const showErrorToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      description: translateText(locale, description),
      duration,
      isClosable: true,
      position: 'top',
      status: 'error',
      title: translateText(locale, title),
    })
  }

  const showInfoToast = (
    title: string,
    description: string,
    duration = 3000
  ) => {
    toast({
      description: translateText(locale, description),
      duration,
      isClosable: true,
      position: 'top',
      status: 'info',
      title: translateText(locale, title),
    })
  }

  return {
    showErrorToast,
    showInfoToast,
    showSuccessToast,
  }
}
