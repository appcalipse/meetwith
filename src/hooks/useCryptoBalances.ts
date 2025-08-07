import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import {
  AcceptedToken,
  getChainInfo,
  getTokenIcon,
  getTokenName,
  getTokenSymbol,
  SupportedChain,
} from '@/types/chains'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'
import { zeroAddress } from '@/utils/generic_utils'
import { getCryptoTokenBalance } from '@/utils/token.service'
import { CryptoConfig } from '@/utils/walletConfig'

import { useCryptoConfig } from './useCryptoConfig'

interface UseCryptoBalancesProps {
  selectedNetwork: string
}

export const useCryptoBalances = ({
  selectedNetwork,
}: UseCryptoBalancesProps) => {
  const { data: cryptoConfig, isLoading: isConfigLoading } = useCryptoConfig()
  const currentAccount = useAccountContext()

  const config = cryptoConfig || []

  // Map network display names to SupportedChain enum
  const networkMap: Record<string, SupportedChain> = {
    Celo: SupportedChain.CELO,
    Arbitrum: SupportedChain.ARBITRUM,
    'Arbitrum Sepolia': SupportedChain.ARBITRUM_SEPOLIA,
  }

  const selectedChain = networkMap[selectedNetwork]
  const chainInfo = selectedChain ? getChainInfo(selectedChain) : null

  const chainTokens = useMemo(() => {
    if (!chainInfo || !supportedPaymentChains.includes(selectedChain)) {
      return []
    }

    return chainInfo.acceptableTokens
      .filter(tokenInfo => tokenInfo.contractAddress !== zeroAddress) // Exclude native tokens
      .filter(tokenInfo => {
        // exclude CELO and CEUR tokens
        if (selectedChain === SupportedChain.CELO) {
          return (
            tokenInfo.token !== AcceptedToken.CELO &&
            tokenInfo.token !== AcceptedToken.CEUR
          )
        }
        return true
      })
      .map(tokenInfo => ({
        token: tokenInfo.token,
        tokenAddress: tokenInfo.contractAddress,
        chainId: chainInfo.id,
        chain: selectedChain,
      }))
  }, [chainInfo, selectedChain])

  // Fetch all balances in parallel using useQueries
  const balanceQueries = useQueries({
    queries: chainTokens.map(tokenInfo => ({
      queryKey: [
        'token-balance',
        currentAccount?.address,
        tokenInfo.tokenAddress,
        tokenInfo.chainId,
      ],
      queryFn: async () => {
        return getCryptoTokenBalance(
          currentAccount?.address || '',
          tokenInfo.tokenAddress,
          tokenInfo.chain
        )
      },
      enabled:
        !!currentAccount?.address &&
        !!tokenInfo.tokenAddress &&
        tokenInfo.chainId !== 0,
      staleTime: 0,
      cacheTime: 0,
      refetchInterval: 10000,
    })),
  })

  // Combine crypto assets with real balances
  const cryptoAssetsWithBalances = useMemo(() => {
    if (
      !config ||
      config.length === 0 ||
      isConfigLoading ||
      !chainInfo ||
      !supportedPaymentChains.includes(selectedChain)
    ) {
      return []
    }

    return chainTokens.map((tokenInfo, index) => {
      const balanceQuery = balanceQueries[index]
      const balance = balanceQuery?.data?.balance || 0
      const isLoading = balanceQuery?.isLoading || false
      const error = balanceQuery?.error

      // Find the corresponding config item based on token type
      const configItem = config.find((item: CryptoConfig) => {
        switch (tokenInfo.token) {
          case AcceptedToken.CUSD:
            return item.symbol === 'cUSD'
          case AcceptedToken.USDC:
            return item.symbol === 'USDC'
          case AcceptedToken.USDT:
            return item.symbol === 'USDT'
          default:
            return false
        }
      }) as CryptoConfig | undefined

      const tokenAddress = tokenInfo.tokenAddress
      const chainId = tokenInfo.chainId

      return {
        name: configItem?.name || getTokenName(tokenInfo.token),
        symbol: configItem?.symbol || getTokenSymbol(tokenInfo.token),
        icon: configItem?.icon || getTokenIcon(tokenInfo.token) || '',
        price: configItem?.price || '0',
        tokenAddress,
        chainId,
        balance: balance
          ? `${balance.toLocaleString()} ${getTokenSymbol(tokenInfo.token)}`
          : `0 ${getTokenSymbol(tokenInfo.token)}`,
        usdValue: balance ? `$${balance.toLocaleString()}` : '$0',
        fullBalance: balance ? balance.toString() : '0',
        currencyIcon: configItem?.icon,
        networkName: selectedNetwork,
        isLoading: isLoading || isConfigLoading,
        error,
      }
    })
  }, [
    selectedNetwork,
    config,
    isConfigLoading,
    chainInfo,
    chainTokens,
    balanceQueries,
    selectedChain,
  ])

  return {
    cryptoAssetsWithBalances,
    balances: {
      ...chainTokens.reduce((acc, tokenInfo, index) => {
        const balanceQuery = balanceQueries[index]
        const key = `${tokenInfo.tokenAddress.toLowerCase()}${selectedNetwork.replace(
          /\s+/g,
          ''
        )}Balance`
        acc[key] = balanceQuery?.data || { balance: 0 }
        return acc
      }, {} as Record<string, { balance: number }>),
    },
  }
}
