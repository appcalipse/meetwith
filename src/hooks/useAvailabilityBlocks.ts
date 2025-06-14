import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { TimeRange } from '@/types/Account'
import { internalFetch } from '@/utils/api_helper'

interface AvailabilityBlock {
  id: string
  title: string
  timezone: string
  isDefault: boolean
  availabilities: Array<{ weekday: number; ranges: TimeRange[] }>
}

export const useAvailabilityBlocks = (accountAddress?: string) => {
  const queryClient = useQueryClient()

  const {
    data: blocks,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['availabilityBlocks', accountAddress],
    queryFn: async () => {
      const response = await internalFetch<AvailabilityBlock[]>(
        '/availabilities'
      )
      return response
    },
    refetchOnMount: true,
    staleTime: 0,
    enabled: !!accountAddress, // Only run the query if we have an account address
  })

  const createBlock = useMutation({
    mutationFn: async (data: {
      title: string
      timezone: string
      weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
      is_default?: boolean
    }) => {
      const response = await internalFetch<AvailabilityBlock>(
        '/availabilities',
        'POST',
        data
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  const updateBlock = useMutation({
    mutationFn: async (data: {
      id: string
      title: string
      timezone: string
      weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
      is_default?: boolean
    }) => {
      const response = await internalFetch<AvailabilityBlock>(
        `/availabilities/${data.id}`,
        'PUT',
        data
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      await internalFetch(`/availabilities/${id}`, 'DELETE')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks', accountAddress],
      })
    },
  })

  const duplicateBlock = useMutation({
    mutationFn: async ({
      id,
      modifiedData,
    }: {
      id: string
      modifiedData: {
        title: string
        timezone: string
        weekly_availability: any[]
        is_default: boolean
      }
    }) => {
      const response = await fetch(`/api/availabilities/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifiedData),
      })
      if (!response.ok) {
        throw new Error('Failed to duplicate availability block')
      }
      return response.json()
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
