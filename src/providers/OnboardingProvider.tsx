import { createContext, FC, ReactNode, useCallback, useState } from 'react'
import { MaybePromise } from 'viem/dist/types/types/utils'

import { Account } from '@/types/Account'
import { NotificationChannel } from '@/types/AccountNotifications'
import {
  getNotificationSubscriptions,
  listConnectedCalendars,
} from '@/utils/api_helper'

interface IOnboardingContext {
  accountDetailsComplete: () => MaybePromise<boolean>
  connectedCalendarsComplete: () => MaybePromise<boolean>
  availabilitiesComplete: () => MaybePromise<boolean>
  completeSteps: () => MaybePromise<number>
  onboardingComplete: () => MaybePromise<boolean>
  isLoading: () => boolean
  reload: () => void
}

const DEFAULT_STATE: IOnboardingContext = {
  accountDetailsComplete: () => false,
  availabilitiesComplete: () => false,
  connectedCalendarsComplete: () => false,
  completeSteps: () => 0,
  onboardingComplete: () => false,
  isLoading: () => false,
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
  const [loadingState, setLoadingState] = useState(0)
  const [firstLoaded, setFirstLoaded] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [reloadTrigger, setReloadTrigger] = useState(0)

  function reload() {
    setReloadTrigger(reloadTrigger + 1)
  }

  const accountDetailsComplete = useCallback(async () => {
    setLoadingState(loadingState + 1)
    const notifications = await getNotificationSubscriptions()
    const emailNotification = notifications?.notification_types?.find(
      notification => notification.channel === NotificationChannel.EMAIL
    )
    setLoadingState(loadingState - 1)

    return (
      !!currentAccount?.preferences?.name &&
      !!currentAccount?.preferences?.timezone &&
      !!emailNotification?.destination
    )
  }, [currentAccount, reloadTrigger])

  const availabilitiesComplete = useCallback(() => {
    return currentAccount?.preferences?.availabilities?.length === 7
  }, [currentAccount, reloadTrigger])

  const connectedCalendarsComplete = useCallback(async () => {
    setLoadingState(loadingState + 1)
    const request = await listConnectedCalendars()
    setLoadingState(loadingState - 1)

    return !!request?.length
  }, [currentAccount, reloadTrigger])

  const completeSteps = useCallback(async () => {
    setLoadingState(loadingState + 1)
    let i = 0
    if (await accountDetailsComplete()) i++
    if (availabilitiesComplete()) i++
    if (await connectedCalendarsComplete()) i++
    setLoadingState(loadingState - 1)
    return i
  }, [currentAccount, reloadTrigger])

  const onboardingComplete = useCallback(
    async () => (await completeSteps()) === 3,
    [currentAccount, reloadTrigger]
  )

  function isLoading() {
    // Important part of the Multiple Loading Trick
    if (loadingState > 0 && !firstLoaded) setFirstLoaded(true)
    if (loadingState === 0 && firstLoaded) setLoaded(true)
    return !loaded
  }

  const onboardingContext = {
    accountDetailsComplete,
    availabilitiesComplete,
    connectedCalendarsComplete,
    completeSteps,
    onboardingComplete,
    isLoading,
    reload,
  }

  return (
    <OnboardingContext.Provider value={onboardingContext}>
      {children}
    </OnboardingContext.Provider>
  )
}
