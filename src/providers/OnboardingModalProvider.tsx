import { useRouter } from 'next/router'
import React, { ReactNode, useState } from 'react'

interface IOnboardingModalContext {
  isConnectionOpened: boolean
  openConnection: (shouldRedirect?: boolean) => void
  openConnection: (redirectPath?: string) => void
  closeConnection: () => void
  isOnboardingOpened: boolean
  openOnboarding: () => void
  closeOnboarding: (redirectPath?: string) => void
  resetOnboarding: () => void
  onboardingStarted: () => void
  onboardingInit: boolean
  shouldRedirect: boolean
  redirectPath: string
}

const OnboardingModalContext = React.createContext<IOnboardingModalContext>({
  isConnectionOpened: false,
  openConnection: () => {},
  closeConnection: () => {},
  isOnboardingOpened: false,
  openOnboarding: () => {},
  closeOnboarding: () => {},
  resetOnboarding: () => {},
  onboardingStarted: () => {},
  onboardingInit: false,
  shouldRedirect: true,
  redirectPath: '',
})

interface WalletModalProviderProps {
  children: ReactNode
}

const OnboardingModalProvider: React.FC<WalletModalProviderProps> = ({
  children,
}) => {
  const [onboardingInit, setOnboardingInit] = useState(false)
  const [connectionOpened, setConnectionOpened] = useState(false)
  const [onboardingOpened, setOnboardingOpened] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(true)

  function openConnection(redirection = true) {
    setShouldRedirect(redirection)
  const [redirectPath, setRedirectPath] = useState('')
  const { push } = useRouter()
  function openConnection(redirectPath?: string) {
    setConnectionOpened(true)
    if (redirectPath) {
      setRedirectPath(redirectPath)
    }
  }

  function closeConnection() {
    setConnectionOpened(false)
  }

  function openOnboarding() {
    setOnboardingOpened(true)
  }

  function closeOnboarding(redirectPath?: string) {
    setOnboardingOpened(false)
    if (redirectPath) {
      push(redirectPath)
    }
  }

  function resetOnboarding() {
    setOnboardingInit(false)
  }

  function onboardingStarted() {
    setOnboardingInit(true)
  }

  const context = {
    isConnectionOpened: connectionOpened,
    openConnection,
    closeConnection,
    isOnboardingOpened: onboardingOpened,
    openOnboarding,
    closeOnboarding,
    resetOnboarding,
    onboardingStarted,
    onboardingInit,
    shouldRedirect,
    redirectPath,
  }
  return (
    <OnboardingModalContext.Provider value={context}>
      {children}
    </OnboardingModalContext.Provider>
  )
}

export { OnboardingModalContext, OnboardingModalProvider }
