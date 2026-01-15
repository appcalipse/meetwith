import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { UseAvailabilityBlocksResult } from '@/types/availability'
import {
  CreateAvailabilityBlockRequest,
  DuplicateAvailabilityBlockRequest,
  UpdateAvailabilityBlockRequest,
} from '@/types/Requests'
import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  duplicateAvailabilityBlock,
  getAvailabilityBlocks,
  updateAvailabilityBlock,
} from '@/utils/api_helper'

export const useAvailabilityBlocks = (
  accountAddress?: string
): UseAvailabilityBlocksResult => {
  const queryClient = useQueryClient()

  const {
    data: blocks,
    isLoading,
    isFetching,
  } = useQuery({
    enabled: !!accountAddress,
    queryFn: getAvailabilityBlocks,
    queryKey: ['availabilityBlocks', accountAddress],
    refetchOnMount: true,
    staleTime: 0,
  })

  const createBlock = useMutation({
    mutationFn: async (data: CreateAvailabilityBlockRequest) => {
      return createAvailabilityBlock(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  const updateBlock = useMutation({
    mutationFn: async (data: UpdateAvailabilityBlockRequest) => {
      return updateAvailabilityBlock(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      return deleteAvailabilityBlock(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  const duplicateBlock = useMutation({
    mutationFn: async (data: DuplicateAvailabilityBlockRequest) => {
      return duplicateAvailabilityBlock(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  return {
    blocks,
    createBlock,
    deleteBlock,
    duplicateBlock,
    isFetching,
    isLoading,
    updateBlock,
  }
}
