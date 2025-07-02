import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { MeetingType } from '@/types/Account'
import {
  getMeetingTypesForAvailabilityBlock,
  updateAvailabilityBlockMeetingTypes,
} from '@/utils/api_helper'

export const useAvailabilityBlockMeetingTypes = (
  availabilityBlockId: string
) => {
  const queryClient = useQueryClient()

  const {
    data: meetingTypes,
    isLoading,
    error,
  } = useQuery<MeetingType[]>({
    queryKey: ['availabilityBlockMeetingTypes', availabilityBlockId],
    queryFn: () => getMeetingTypesForAvailabilityBlock(availabilityBlockId),
    enabled: !!availabilityBlockId,
  })

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
    },
  })

  return {
    meetingTypes: meetingTypes || [],
    isLoading,
    error,
    updateMeetingTypes: updateMutation.mutate,
    isUpdating: updateMutation.isLoading,
  }
}
