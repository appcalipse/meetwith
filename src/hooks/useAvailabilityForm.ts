import { useState } from 'react'

import { Account } from '@/types/Account'
import { TimeRange } from '@/types/Account'
import { initializeEmptyAvailabilities } from '@/utils/availability.helper'

interface FormState {
  title: string
  timezone: string | null | undefined
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
  isDefault: boolean
}

export const useAvailabilityForm = (currentAccount: Account) => {
  const [formState, setFormState] = useState<FormState>({
    title: '',
    timezone: currentAccount?.preferences.timezone,
    availabilities: initializeEmptyAvailabilities(),
    isDefault: false,
  })

  const resetForm = () => {
    setFormState({
      title: '',
      timezone: currentAccount?.preferences.timezone,
      availabilities: initializeEmptyAvailabilities(),
      isDefault: false,
    })
  }

  const updateAvailability = (day: number, ranges: TimeRange[] | null) => {
    setFormState(prev => {
      const newAvailabilities = prev.availabilities.map(availability => {
        if (availability.weekday === day) {
          return { weekday: day, ranges: ranges ?? [] }
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
    updateAvailability,
    setTitle,
    setTimezone,
    setIsDefault,
  }
}
