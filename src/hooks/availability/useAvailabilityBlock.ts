import { useQuery } from '@tanstack/react-query'

import { getAvailabilityBlock } from '@/utils/api_helper'

export const useAvailabilityBlock = (blockId?: string) => {
  const {
    data: block,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['availabilityBlock', blockId],
    queryFn: () => getAvailabilityBlock(blockId!),
    enabled: !!blockId,
    refetchOnMount: true,
    staleTime: 0,
  })

  return {
    block,
    isLoading,
    isFetching,
    error,
  }
}
