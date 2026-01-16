import { useQuery } from '@tanstack/react-query'

import { getCryptoConfig } from '@/utils/walletConfig'

export const useCryptoConfig = () => {
  return useQuery({
    cacheTime: 300000,
    queryFn: getCryptoConfig,
    queryKey: ['cryptoConfig'],
    staleTime: 30000,
  })
}
