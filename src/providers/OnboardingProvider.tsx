import { createContext, FC, ReactNode, useCallback, useState } from 'react'
import { MaybePromise } from 'viem/dist/types/types/utils'

import { Account } from '@/types/Account'
import { listConnectedCalendars } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

interface IOnboardingContext {
  accountDetailsComplete: () => MaybePromise<boolean>
  connectedCalendarsComplete: () => MaybePromise<boolean>
  availabilitiesComplete: () => MaybePromise<boolean>
  completeSteps: () => MaybePromise<number>
  onboardingComplete: () => MaybePromise<boolean>
  isLoaded: boolean
  reload: () => void
}

const DEFAULT_STATE: IOnboardingContext = {
  accountDetailsComplete: () => false,
  availabilitiesComplete: () => false,
  connectedCalendarsComplete: () => false,
  completeSteps: () => 0,
  onboardingComplete: () => false,
  isLoaded: false,
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

  const availabilitiesComplete = useCallback(() => {
    const anyTimes =
      currentAccount?.preferences?.availabilities?.some(
        dayAvailability => dayAvailability?.ranges?.length
      ) || false
    return anyTimes && !!currentAccount?.preferences?.timezone
  }, [currentAccount, reloadTrigger])

  const connectedCalendarsComplete = useCallback(async () => {
    const request = await listConnectedCalendars(false)

    return !!request?.length
  }, [currentAccount, reloadTrigger])

  const completeSteps = useCallback(async () => {
    let i = 0

    if (accountDetailsComplete()) i++
    if (availabilitiesComplete()) i++
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
    connectedCalendarsComplete,
    completeSteps,
    onboardingComplete,
    isLoaded: loadedState,
    reload,
  }

  return (
    <OnboardingContext.Provider value={onboardingContext}>
      {children}
    </OnboardingContext.Provider>
  )
}
