import { useQuery } from '@tanstack/react-query'

import { getAvailabilityBlock } from '@/utils/api_helper'

export const useAvailabilityBlock = (blockId?: string) => {
  const {
    data: block,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    enabled: !!blockId,
    queryFn: () => getAvailabilityBlock(blockId!),
    queryKey: ['availabilityBlock', blockId],
    refetchOnMount: true,
    staleTime: 0,
  })

  return {
    block,
    error,
    isFetching,
    isLoading,
  }
}
