import { useState } from 'react'
import { Account, TimeRange } from '@/types/Account'
import {
  getBestTimezone,
  initializeDefaultAvailabilities,
} from '@/utils/availability.helper'

interface FormState {
  title: string
  timezone: string | null | undefined
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
  isDefault: boolean
}

export const useAvailabilityForm = (currentAccount: Account) => {
  const [formState, setFormState] = useState<FormState>({
    availabilities: initializeDefaultAvailabilities(),
    isDefault: false,
    timezone: getBestTimezone(currentAccount),
    title: '',
  })

  const resetForm = () => {
    setFormState({
      availabilities: initializeDefaultAvailabilities(),
      isDefault: false,
      timezone: getBestTimezone(currentAccount),
      title: '',
    })
  }

  const updateAvailability = (day: number, ranges: TimeRange[] | null) => {
    setFormState(prev => {
      const newAvailabilities = prev.availabilities.map(availability => {
        if (availability.weekday === day) {
          return { ranges: ranges ?? [], weekday: day }
        }
        return availability
      })
      return {
        ...prev,
        availabilities: newAvailabilities,
      }
    })
  }

  const setTitle = (title: string) => {
    setFormState(prev => ({ ...prev, title }))
  }

  const setTimezone = (timezone: string | null | undefined) => {
    setFormState(prev => ({ ...prev, timezone }))
  }

  const setIsDefault = (isDefault: boolean) => {
    setFormState(prev => ({ ...prev, isDefault }))
  }

  return {
    formState,
    resetForm,
    setIsDefault,
    setTimezone,
    setTitle,
    updateAvailability,
  }
}
