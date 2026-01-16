import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { MeetingType } from '@/types/Account'
import {
  getMeetingTypesForAvailabilityBlock,
  updateAvailabilityBlockMeetingTypes,
} from '@/utils/api_helper'

export const useAvailabilityBlockMeetingTypes = (
  availabilityBlockId: string
) => {
  const {
    data: meetingTypes,
    isLoading,
    error,
  } = useQuery<MeetingType[]>({
    enabled: !!availabilityBlockId,
    queryFn: () => getMeetingTypesForAvailabilityBlock(availabilityBlockId),
    queryKey: ['availabilityBlockMeetingTypes', availabilityBlockId],
  })

  return {
    error,
    isLoading,
    meetingTypes: meetingTypes || [],
  }
}

export const useUpdateAvailabilityBlockMeetingTypes = (
  availabilityBlockId: string
) => {
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (meetingTypeIds: string[]) =>
      updateAvailabilityBlockMeetingTypes({
        availability_block_id: availabilityBlockId,
        meeting_type_ids: meetingTypeIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlockMeetingTypes', availabilityBlockId],
      })
      queryClient.invalidateQueries({
        queryKey: ['availabilityBlocks'],
      })
    },
  })

  return {
    isUpdating: updateMutation.isLoading,
    updateMeetingTypes: updateMutation.mutate,
  }
}
