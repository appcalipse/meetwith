import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

export const useAvailabilityBlocks = (accountAddress?: string) => {
  const queryClient = useQueryClient()

  const {
    data: blocks,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['availabilityBlocks', accountAddress],
    queryFn: getAvailabilityBlocks,
    refetchOnMount: true,
    staleTime: 0,
    enabled: !!accountAddress,
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
    isLoading,
    isFetching,
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  }
}
