import { createContext, FC, ReactNode, useCallback, useState } from 'react'
import { MaybePromise } from 'viem/dist/types/types/utils'

import { Account } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import {
  getAvailabilityBlocks,
  listConnectedCalendars,
} from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

interface IOnboardingContext {
  accountDetailsComplete: () => MaybePromise<boolean>
  connectedCalendarsComplete: () => MaybePromise<boolean>
  availabilitiesComplete: () => Promise<boolean>
  completeSteps: () => Promise<number>
  onboardingComplete: () => Promise<boolean>
  isLoaded: boolean
  reload: () => void
}

const DEFAULT_STATE: IOnboardingContext = {
  accountDetailsComplete: () => false,
  availabilitiesComplete: () => Promise.resolve(false),
  completeSteps: () => Promise.resolve(0),
  connectedCalendarsComplete: () => false,
  isLoaded: false,
  onboardingComplete: () => Promise.resolve(false),
  reload: () => void 0,
}

export const OnboardingContext =
  createContext<IOnboardingContext>(DEFAULT_STATE)

interface OnboardingProviderProps {
  currentAccount?: Account | null
  children: ReactNode
}

export const OnboardingProvider: FC<OnboardingProviderProps> = ({
  children,
  currentAccount,
}) => {
  // Terrible trick to control initial loading state for multiple watchers
  const [loadedState, setLoadedState] = useState(false)

  const [reloadTrigger, setReloadTrigger] = useState(0)

  function reload() {
    queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))
    setReloadTrigger(reloadTrigger + 1)
  }

  const accountDetailsComplete = useCallback(() => {
    return !!currentAccount?.preferences?.name
  }, [currentAccount, reloadTrigger])

  const availabilitiesComplete = useCallback(async () => {
    if (!currentAccount?.address) return false

    try {
      const blocks = await getAvailabilityBlocks()
      const hasAvailabilityBlocks = blocks.some((block: AvailabilityBlock) =>
        block.weekly_availability?.some(day => day.ranges?.length > 0)
      )

      return hasAvailabilityBlocks
    } catch (error) {
      console.error('Error checking availability blocks:', error)
      return false
    }
  }, [currentAccount, reloadTrigger])

  const connectedCalendarsComplete = useCallback(async () => {
    const request = await listConnectedCalendars(false)

    return (
      !!request?.length &&
      request.some(val => val.grantedPermissions === val.expectedPermissions)
    )
  }, [currentAccount, reloadTrigger])

  const completeSteps = useCallback(async () => {
    let i = 0

    if (accountDetailsComplete()) i++
    if (await availabilitiesComplete()) i++
    if (await connectedCalendarsComplete()) i++

    return i
  }, [currentAccount, reloadTrigger])

  const onboardingComplete = useCallback(async () => {
    const stepsCompleted = await completeSteps()
    setLoadedState(true)
    return stepsCompleted === 3
  }, [currentAccount, reloadTrigger])

  const onboardingContext = {
    accountDetailsComplete,
    availabilitiesComplete,
    completeSteps,
    connectedCalendarsComplete,
    isLoaded: loadedState,
    onboardingComplete,
    reload,
  }

  return (
    <OnboardingContext.Provider value={onboardingContext}>
      {children}
    </OnboardingContext.Provider>
  )
}
