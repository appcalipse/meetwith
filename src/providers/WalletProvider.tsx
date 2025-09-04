import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { SupportedChain, supportedChains } from '@/types/chains'
import { Transaction } from '@/types/Transactions'
import { getPaymentPreferences } from '@/utils/api_helper'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'

interface CryptoAsset {
  name: string
  symbol: string
  icon: string
  price: string
  balance: string
  usdValue: string
  fullBalance?: string
  currencyIcon?: string
  tokenAddress: string
  chainId: number
  networkName?: string
  isLoading?: boolean
}

interface WalletContextType {
  // View states
  showBalance: boolean
  setShowBalance: (show: boolean) => void
  showTransactions: boolean
  setShowTransactions: (show: boolean) => void
  showTransactionDetails: boolean
  setShowTransactionDetails: (show: boolean) => void
  showCryptoDetails: boolean
  setShowCryptoDetails: (show: boolean) => void

  // Selection states
  selectedCurrency: string
  setSelectedCurrency: (currency: string) => void
  selectedNetwork: SupportedChain | null
  setSelectedNetwork: (network: SupportedChain) => void
  selectedTransaction: Transaction | null
  setSelectedTransaction: (transaction: Transaction | null) => void
  selectedCrypto: CryptoAsset | null
  setSelectedCrypto: (crypto: CryptoAsset | null) => void
  isNetworkLoading: boolean

  // Modal states
  isCurrencyModalOpen: boolean
  setIsCurrencyModalOpen: (open: boolean) => void
  isNetworkModalOpen: boolean
  setIsNetworkModalOpen: (open: boolean) => void
  isSendModalOpen: boolean
  setIsSendModalOpen: (open: boolean) => void
  isReceiveModalOpen: boolean
  setIsReceiveModalOpen: (open: boolean) => void

  // Search and pagination
  searchQuery: string
  setSearchQuery: (query: string) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  selectedCryptoCurrentPage: number
  setSelectedCryptoCurrentPage: (page: number) => void

  // Reset functions
  resetPagination: () => void
  resetWalletState: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // View states
  const [showBalance, setShowBalance] = useState(true)
  const [showTransactions, setShowTransactions] = useState(false)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [showCryptoDetails, setShowCryptoDetails] = useState(false)

  // Selection states
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChain | null>(
    null
  )
  const [isNetworkLoading, setIsNetworkLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset | null>(null)

  // Modal states
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)

  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCryptoCurrentPage, setSelectedCryptoCurrentPage] = useState(1)

  // Fetch user's preferred network from payment preferences
  useEffect(() => {
    const fetchPreferredNetwork = async () => {
      try {
        const preferences = await getPaymentPreferences()
        if (preferences?.default_chain_id) {
          // Find the chain by ID
          const preferredChain = supportedChains.find(
            chain => chain.id === preferences.default_chain_id
          )
          // Check if it's wallet-supported and in supportedPaymentChains
          if (
            preferredChain &&
            preferredChain.walletSupported &&
            supportedPaymentChains.includes(preferredChain.chain)
          ) {
            setSelectedNetwork(preferredChain.chain)
            setIsNetworkLoading(false)
            return
          }
        }

        // If no preferred network or invalid preference, set fallback
        const fallbackChain = supportedChains.find(
          chain =>
            chain.walletSupported &&
            supportedPaymentChains.includes(chain.chain)
        )
        if (fallbackChain) {
          setSelectedNetwork(fallbackChain.chain)
        }
        setIsNetworkLoading(false)
      } catch (error) {
        console.warn('Failed to get payment preferences:', error)

        // On error, also set fallback
        const fallbackChain = supportedChains.find(
          chain =>
            chain.walletSupported &&
            supportedPaymentChains.includes(chain.chain)
        )
        if (fallbackChain) {
          setSelectedNetwork(fallbackChain.chain)
        }
        setIsNetworkLoading(false)
      }
    }

    fetchPreferredNetwork()
  }, [])

  const resetPagination = useCallback(() => {
    setCurrentPage(1)
    setSelectedCryptoCurrentPage(1)
  }, [])

  const resetWalletState = useCallback(() => {
    setShowTransactions(false)
    setShowTransactionDetails(false)
    setShowCryptoDetails(false)
    setSelectedTransaction(null)
    setSelectedCrypto(null)
    setSearchQuery('')
    resetPagination()
  }, [resetPagination])

  const value: WalletContextType = {
    // View states
    showBalance,
    setShowBalance,
    showTransactions,
    setShowTransactions,
    showTransactionDetails,
    setShowTransactionDetails,
    showCryptoDetails,
    setShowCryptoDetails,

    // Selection states
    selectedCurrency,
    setSelectedCurrency,
    selectedNetwork,
    setSelectedNetwork,
    selectedTransaction,
    setSelectedTransaction,
    selectedCrypto,
    setSelectedCrypto,

    // Loading state
    isNetworkLoading,

    // Modal states
    isCurrencyModalOpen,
    setIsCurrencyModalOpen,
    isNetworkModalOpen,
    setIsNetworkModalOpen,
    isSendModalOpen,
    setIsSendModalOpen,
    isReceiveModalOpen,
    setIsReceiveModalOpen,

    // Search and pagination
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    selectedCryptoCurrentPage,
    setSelectedCryptoCurrentPage,

    // Reset functions
    resetPagination,
    resetWalletState,
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
