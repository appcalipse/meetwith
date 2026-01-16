import { useQuery } from '@tanstack/react-query'

import { MeetingType } from '@/types/Account'
import { getMeetingType } from '@/utils/api_helper'

export const useMeetingType = (meetingTypeId: string | undefined) => {
  return useQuery({
    enabled: !!meetingTypeId,
    queryFn: () => getMeetingType(meetingTypeId!),
    queryKey: ['meetingType', meetingTypeId],
  })
}
