import React, { ReactNode, useState } from 'react'

interface IOnboardingModalContext {
  isConnectionOpened: boolean
  openConnection: (shouldRedirect?: boolean) => void
  closeConnection: () => void
  isOnboardingOpened: boolean
  openOnboarding: () => void
  closeOnboarding: () => void
  resetOnboarding: () => void
  onboardingStarted: () => void
  onboardingInit: boolean
  shouldRedirect: boolean
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
    setConnectionOpened(true)
  }

  function closeConnection() {
    setConnectionOpened(false)
  }

  function openOnboarding() {
    setOnboardingOpened(true)
  }

  function closeOnboarding() {
    setOnboardingOpened(false)
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
  }
  return (
    <OnboardingModalContext.Provider value={context}>
      {children}
    </OnboardingModalContext.Provider>
  )
}

export { OnboardingModalContext, OnboardingModalProvider }
