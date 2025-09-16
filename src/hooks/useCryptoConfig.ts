import { useQuery } from '@tanstack/react-query'

import { getCryptoConfig } from '@/utils/walletConfig'

export const useCryptoConfig = () => {
  return useQuery({
    queryKey: ['cryptoConfig'],
    queryFn: getCryptoConfig,
    staleTime: 30000,
    cacheTime: 300000,
  })
}
