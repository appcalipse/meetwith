import { useQuery } from '@tanstack/react-query'

import { MeetingType } from '@/types/Account'
import { getMeetingTypes } from '@/utils/api_helper'

export const useAllMeetingTypes = () => {
  const {
    data: meetingTypes,
    isLoading,
    error,
  } = useQuery<MeetingType[]>({
    queryKey: ['allMeetingTypes'],
    queryFn: () => getMeetingTypes(100, 0),
  })

  return {
    meetingTypes: meetingTypes || [],
    isLoading,
    error,
  }
}
