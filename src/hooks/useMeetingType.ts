import { useQuery } from '@tanstack/react-query'

import { MeetingType } from '@/types/Account'
import { getMeetingType } from '@/utils/api_helper'

export const useMeetingType = (meetingTypeId: string | undefined) => {
  return useQuery({
    queryKey: ['meetingType', meetingTypeId],
    queryFn: () => getMeetingType(meetingTypeId!),
    enabled: !!meetingTypeId,
  })
}
