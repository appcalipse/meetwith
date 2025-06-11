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

export const useAvailabilityBlocks = () => {
  const queryClient = useQueryClient()

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['availabilityBlocks'],
    queryFn: async () => {
      const response = await internalFetch<AvailabilityBlock[]>(
        '/availabilities'
      )
      return response
    },
  })

  const createBlock = useMutation({
    mutationFn: async (data: {
      title: string
      timezone: string
      weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
    }) => {
      const response = await internalFetch<AvailabilityBlock>(
        '/availabilities',
        'POST',
        data
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks'] })
    },
  })

  const updateBlock = useMutation({
    mutationFn: async (data: {
      id: string
      title: string
      timezone: string
      weekly_availability: Array<{ weekday: number; ranges: TimeRange[] }>
    }) => {
      const response = await internalFetch<AvailabilityBlock>(
        `/availabilities/${data.id}`,
        'PUT',
        data
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks'] })
    },
  })

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      await internalFetch(`/availabilities/${id}`, 'DELETE')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks'] })
    },
  })

  const duplicateBlock = useMutation({
    mutationFn: async (id: string) => {
      const response = await internalFetch<AvailabilityBlock>(
        `/availabilities/${id}`,
        'POST'
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks'] })
    },
  })

  return {
    blocks,
    isLoading,
    createBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  }
}
