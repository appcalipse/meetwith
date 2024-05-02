import React, { ReactNode, useState } from 'react'

interface IWalletModalContext {
  isOpen: boolean
  open: () => void
  close: () => void
}

const WalletModalContext = React.createContext<IWalletModalContext>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

interface WalletModalProviderProps {
  children: ReactNode
}

const WalletModalProvider: React.FC<WalletModalProviderProps> = ({
  children,
}) => {
  const [opened, setOpened] = useState(false)

  function setOpen() {
    setOpened(true)
  }

  function close() {
    setOpened(false)
  }

  function isOpened() {
    return opened
  }

  const context = {
    isOpen: isOpened(),
    open: setOpen,
    close: close,
  }
  return (
    <WalletModalContext.Provider value={context}>
      {children}
    </WalletModalContext.Provider>
  )
}

export { WalletModalContext, WalletModalProvider }
