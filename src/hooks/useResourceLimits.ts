import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { PollStatus } from '@/types/QuickPoll'
import {
  getCalendarIntegrationsWithMetadata,
  getGroupsFullWithMetadata,
  getMeetingTypesWithMetadata,
  getQuickPolls,
} from '@/utils/api_helper'

interface UseResourceLimitsResult {
  canCreateGroup: boolean
  canCreateQuickPoll: boolean
  canCreateMeetingType: boolean
  canCreateCalendar: boolean
  isLoading: boolean
}

export const useResourceLimits = (): UseResourceLimitsResult => {
  const { currentAccount } = useContext(AccountContext)

  // Fetch resource metadata - API responses include upgradeRequired flag
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['groupsMetadata', currentAccount?.address],
    queryFn: async () => {
      const response = await getGroupsFullWithMetadata(1, 0, '', true)
      return {
        total: response.total || 0,
        upgradeRequired: response.upgradeRequired || false,
      }
    },
    enabled: !!currentAccount?.address,
    staleTime: 30000,
  })

  const { data: pollsData, isLoading: isLoadingPolls } = useQuery({
    queryKey: ['pollsMetadata', currentAccount?.address],
    queryFn: async () => {
      const response = await getQuickPolls(1, 0, undefined, PollStatus.ONGOING)
      return {
        total: response.total_count || 0,
        upgradeRequired: response.upgradeRequired || false,
      }
    },
    enabled: !!currentAccount?.address,
    staleTime: 30000,
  })

  const { data: meetingTypesData, isLoading: isLoadingMeetingTypes } = useQuery(
    {
      queryKey: ['meetingTypesMetadata', currentAccount?.address],
      queryFn: async () => {
        const response = await getMeetingTypesWithMetadata(10, 0)
        return {
          total: response.total || 0,
          upgradeRequired: response.upgradeRequired || false,
        }
      },
      enabled: !!currentAccount?.address,
      staleTime: 30000,
    }
  )

  const { data: calendarsData, isLoading: isLoadingCalendars } = useQuery({
    queryKey: ['calendarsMetadata', currentAccount?.address],
    queryFn: async () => {
      const response = await getCalendarIntegrationsWithMetadata()
      return {
        total: response.total || 0,
        upgradeRequired: response.upgradeRequired || false,
      }
    },
    enabled: !!currentAccount?.address,
    staleTime: 30000,
  })

  const isLoading =
    isLoadingGroups ||
    isLoadingPolls ||
    isLoadingMeetingTypes ||
    isLoadingCalendars

  // Determine if user can create resources based on upgradeRequired flag
  const canCreateGroup = !groupsData?.upgradeRequired
  const canCreateQuickPoll = !pollsData?.upgradeRequired
  const canCreateMeetingType = !meetingTypesData?.upgradeRequired
  const canCreateCalendar = !calendarsData?.upgradeRequired

  return {
    canCreateGroup,
    canCreateQuickPoll,
    canCreateMeetingType,
    canCreateCalendar,
    isLoading,
  }
}
