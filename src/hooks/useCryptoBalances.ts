import { useMemo } from 'react'

import {
  AcceptedToken,
  getChainId,
  getTokenAddress,
  SupportedChain,
} from '@/types/chains'
import { CRYPTO_CONFIG } from '@/utils/walletConfig'

import { useCryptoBalance } from './useCryptoBalance'

interface UseCryptoBalancesProps {
  selectedNetwork: string
}

export const useCryptoBalances = ({
  selectedNetwork,
}: UseCryptoBalancesProps) => {
  // Fetch balances for each crypto asset
  const cusdCeloBalance = useCryptoBalance(
    getTokenAddress(SupportedChain.CELO, AcceptedToken.CUSD),
    getChainId(SupportedChain.CELO)
  )
  const usdcCeloBalance = useCryptoBalance(
    getTokenAddress(SupportedChain.CELO, AcceptedToken.USDC),
    getChainId(SupportedChain.CELO)
  )
  const usdtCeloBalance = useCryptoBalance(
    getTokenAddress(SupportedChain.CELO, AcceptedToken.USDT),
    getChainId(SupportedChain.CELO)
  )

  const usdcArbitrumBalance = useCryptoBalance(
    getTokenAddress(SupportedChain.ARBITRUM, AcceptedToken.USDC),
    getChainId(SupportedChain.ARBITRUM)
  )
  const usdtArbitrumBalance = useCryptoBalance(
    getTokenAddress(SupportedChain.ARBITRUM, AcceptedToken.USDT),
    getChainId(SupportedChain.ARBITRUM)
  )

  const usdcArbitrumSepoliaBalance = useCryptoBalance(
    getTokenAddress(SupportedChain.ARBITRUM_SEPOLIA, AcceptedToken.USDC),
    getChainId(SupportedChain.ARBITRUM_SEPOLIA)
  )

  // Combine crypto assets with real balances
  const cryptoAssetsWithBalances = useMemo(() => {
    if (selectedNetwork === 'Celo') {
      return [
        {
          ...CRYPTO_CONFIG[0], // cUSD
          tokenAddress: CRYPTO_CONFIG[0].tokenAddress || '',
          chainId: CRYPTO_CONFIG[0].celoChainId || 0,
          balance: cusdCeloBalance.balance
            ? `${cusdCeloBalance.balance.toLocaleString()} cUSD`
            : '0 cUSD',
          usdValue: cusdCeloBalance.balance
            ? `$${cusdCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: cusdCeloBalance.balance
            ? cusdCeloBalance.balance.toString()
            : '0',
          currencyIcon: CRYPTO_CONFIG[0].icon,
          networkName: 'Celo',
          isLoading: cusdCeloBalance.isLoading,
        },
        {
          ...CRYPTO_CONFIG[1], // USDC Celo
          tokenAddress: CRYPTO_CONFIG[1].tokenAddress || '',
          chainId: CRYPTO_CONFIG[1].celoChainId || 0,
          balance: usdcCeloBalance.balance
            ? `${usdcCeloBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcCeloBalance.balance
            ? `$${usdcCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcCeloBalance.balance
            ? usdcCeloBalance.balance.toString()
            : '0',
          currencyIcon: CRYPTO_CONFIG[1].icon,
          networkName: 'Celo',
          isLoading: usdcCeloBalance.isLoading,
        },
        {
          ...CRYPTO_CONFIG[2], // USDT Celo
          tokenAddress: CRYPTO_CONFIG[2].tokenAddress || '',
          chainId: CRYPTO_CONFIG[2].celoChainId || 0,
          balance: usdtCeloBalance.balance
            ? `${usdtCeloBalance.balance.toLocaleString()} USDT`
            : '0 USDT',
          usdValue: usdtCeloBalance.balance
            ? `$${usdtCeloBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdtCeloBalance.balance
            ? usdtCeloBalance.balance.toString()
            : '0',
          currencyIcon: CRYPTO_CONFIG[2].icon,
          networkName: 'Celo',
          isLoading: usdtCeloBalance.isLoading,
        },
      ]
    } else if (selectedNetwork === 'Arbitrum') {
      return [
        {
          ...CRYPTO_CONFIG[1], // USDC Arbitrum
          tokenAddress: CRYPTO_CONFIG[1].arbitrumTokenAddress || '',
          chainId: CRYPTO_CONFIG[1].arbitrumChainId || 0,
          balance: usdcArbitrumBalance.balance
            ? `${usdcArbitrumBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcArbitrumBalance.balance
            ? `$${usdcArbitrumBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcArbitrumBalance.balance
            ? usdcArbitrumBalance.balance.toString()
            : '0',
          currencyIcon: CRYPTO_CONFIG[1].icon,
          networkName: 'Arbitrum',
          isLoading: usdcArbitrumBalance.isLoading,
        },
        {
          ...CRYPTO_CONFIG[2], // USDT Arbitrum
          tokenAddress: CRYPTO_CONFIG[2].arbitrumTokenAddress || '',
          chainId: CRYPTO_CONFIG[2].arbitrumChainId || 0,
          balance: usdtArbitrumBalance.balance
            ? `${usdtArbitrumBalance.balance.toLocaleString()} USDT`
            : '0 USDT',
          usdValue: usdtArbitrumBalance.balance
            ? `$${usdtArbitrumBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdtArbitrumBalance.balance
            ? usdtArbitrumBalance.balance.toString()
            : '0',
          currencyIcon: CRYPTO_CONFIG[2].icon,
          networkName: 'Arbitrum',
          isLoading: usdtArbitrumBalance.isLoading,
        },
      ]
    } else if (selectedNetwork === 'Arbitrum Sepolia') {
      return [
        {
          ...CRYPTO_CONFIG[1], // USDC Arbitrum Sepolia
          tokenAddress: CRYPTO_CONFIG[1].arbitrumSepoliaTokenAddress || '',
          chainId: CRYPTO_CONFIG[1].arbitrumSepoliaChainId || 0,
          balance: usdcArbitrumSepoliaBalance.balance
            ? `${usdcArbitrumSepoliaBalance.balance.toLocaleString()} USDC`
            : '0 USDC',
          usdValue: usdcArbitrumSepoliaBalance.balance
            ? `$${usdcArbitrumSepoliaBalance.balance.toLocaleString()}`
            : '$0',
          fullBalance: usdcArbitrumSepoliaBalance.balance
            ? usdcArbitrumSepoliaBalance.balance.toString()
            : '0',
          currencyIcon: CRYPTO_CONFIG[1].icon,
          networkName: 'Arbitrum Sepolia',
          isLoading: usdcArbitrumSepoliaBalance.isLoading,
        },
      ]
    }
    return []
  }, [
    selectedNetwork,
    cusdCeloBalance,
    usdcCeloBalance,
    usdtCeloBalance,
    usdcArbitrumBalance,
    usdtArbitrumBalance,
    usdcArbitrumSepoliaBalance,
  ])

  return {
    cryptoAssetsWithBalances,
    balances: {
      cusdCeloBalance,
      usdcCeloBalance,
      usdtCeloBalance,
      usdcArbitrumBalance,
      usdtArbitrumBalance,
      usdcArbitrumSepoliaBalance,
    },
  }
}
