import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { Account } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import { LeanContact } from '@/types/Contacts'
import { GetGroupsFullResponse } from '@/types/Group'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { IGroupParticipant, isGroupParticipant } from '@/types/schedule'
import { getContactsLean, getGroupsFull } from '@/utils/api_helper'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { handleApiError } from '@/utils/error_helper'
import { getMergedParticipants } from '@/utils/schedule.helper'

export interface IParticipantsContext {
  participants: Array<ParticipantInfo | IGroupParticipant>
  standAloneParticipants: Array<ParticipantInfo>
  groupParticipants: Record<string, Array<string> | undefined>
  groupAvailability: Record<string, Array<string> | undefined>
  groupMembersAvailabilities: Record<
    string,
    Record<string, AvailabilityBlock[]>
  >
  meetingMembers: Array<Account>
  meetingOwners: Array<ParticipantInfo>
  groups: Array<GetGroupsFullResponse>
  isGroupPrefetching: boolean
  isContactsPrefetching: boolean
  contacts: Array<LeanContact>
  setGroups: React.Dispatch<React.SetStateAction<Array<GetGroupsFullResponse>>>
  setParticipants: React.Dispatch<
    React.SetStateAction<Array<ParticipantInfo | IGroupParticipant>>
  >
  setStandAloneParticipants: React.Dispatch<
    React.SetStateAction<Array<ParticipantInfo>>
  >
  setGroupParticipants: React.Dispatch<
    React.SetStateAction<Record<string, Array<string> | undefined>>
  >
  setGroupAvailability: React.Dispatch<
    React.SetStateAction<Record<string, Array<string> | undefined>>
  >
  setGroupMembersAvailabilities: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, AvailabilityBlock[]>>>
  >
  setMeetingMembers: React.Dispatch<React.SetStateAction<Array<Account>>>
  setMeetingOwners: React.Dispatch<React.SetStateAction<Array<ParticipantInfo>>>
  setIsGroupPrefetching: React.Dispatch<React.SetStateAction<boolean>>
  addGroup: (group: IGroupParticipant) => void
  removeGroup: (groupId: string) => void

  removeParticipant: (participant: ParticipantInfo) => void
  toggleAvailability: (accountAddress: string) => void
  allAvailaibility: Array<ParticipantInfo>
  allParticipants: Array<ParticipantInfo>
}

export const ParticipantsContext = createContext<
  IParticipantsContext | undefined
>(undefined)

export const useParticipants = () => {
  const context = useContext(ParticipantsContext)
  if (!context) {
    throw new Error('useParticipants must be used within ParticipantsProvider')
  }
  return context
}

interface ParticipantsProviderProps {
  children: ReactNode
  skipFetching?: boolean
}

export const ParticipantsProvider: React.FC<ParticipantsProviderProps> = ({
  children,
  skipFetching = false,
}) => {
  const currentAccount = useAccountContext()
  const [participants, setParticipants] = useState<
    Array<ParticipantInfo | IGroupParticipant>
  >([
    {
      account_address: currentAccount?.address,
      isHidden: true,
      meeting_id: '',
      name: currentAccount?.preferences?.name,
      slot_id: '',
      status: ParticipationStatus.Accepted,
      type: ParticipantType.Scheduler,
    },
  ])

  const [standAloneParticipants, setStandAloneParticipants] = useState<
    Array<ParticipantInfo>
  >([])
  const [groupParticipants, setGroupParticipants] = useState<
    Record<string, Array<string> | undefined>
  >({
    [NO_GROUP_KEY]: [currentAccount?.address || ''],
  })
  const [groupAvailability, setGroupAvailability] = useState<
    Record<string, Array<string> | undefined>
  >({
    [NO_GROUP_KEY]: [currentAccount?.address || ''],
  })
  const [groupMembersAvailabilities, setGroupMembersAvailabilities] = useState<
    Record<string, Record<string, AvailabilityBlock[]>>
  >({})
  const [meetingMembers, setMeetingMembers] = useState<Array<Account>>([])
  const [meetingOwners, setMeetingOwners] = useState<Array<ParticipantInfo>>([])
  const [groups, setGroups] = useState<Array<GetGroupsFullResponse>>([])
  const [isGroupPrefetching, setIsGroupPrefetching] = useState(false)
  const [contacts, setContacts] = useState<Array<LeanContact>>([])
  const [isContactsPrefetching, setIsContactsPrefetching] = useState(false)

  const addGroup = (group: IGroupParticipant) => {
    setParticipants(prev => {
      const groupAdded = prev.some(val => {
        if (isGroupParticipant(val)) {
          return val.isGroup && val.id === group.id
        }
        return false
      })
      if (groupAdded) {
        return prev
      }
      return [...prev, group]
    })
  }

  const removeGroup = (groupId: string) => {
    setParticipants(prev =>
      prev.filter(val => {
        if (isGroupParticipant(val)) {
          return val.id !== groupId
        }
        return true
      })
    )
    setGroupAvailability(prev => {
      const newGroupAvailability = { ...prev }
      delete newGroupAvailability[groupId]
      return newGroupAvailability
    })

    setGroupParticipants(prev => {
      const newGroupParticipants = { ...prev }
      delete newGroupParticipants[groupId]
      return newGroupParticipants
    })

    setGroupMembersAvailabilities(prev => {
      const newGroupMembersAvailabilities = { ...prev }
      delete newGroupMembersAvailabilities[groupId]
      return newGroupMembersAvailabilities
    })
  }
  const fetchGroups = async () => {
    setIsGroupPrefetching(true)
    try {
      const fetchedGroups = await getGroupsFull(
        undefined,
        undefined,
        undefined,
        false
      )
      setGroups(fetchedGroups)
    } catch (error) {
      handleApiError('Error fetching groups.', error)
    } finally {
      setIsGroupPrefetching(false)
    }
  }
  const fetchContacts = async () => {
    setIsContactsPrefetching(true)
    try {
      const newContacts = await getContactsLean()
      setContacts(newContacts)
    } catch (error) {
      handleApiError('Error fetching groups.', error)
    } finally {
      setIsContactsPrefetching(false)
    }
  }
  const handlePrefetchContacts = async () => {
    await Promise.all([fetchContacts(), fetchGroups()])
  }
  useEffect(() => {
    if (!skipFetching) {
      void handlePrefetchContacts()
    }
  }, [skipFetching])
  const addressToGroupMap = useMemo(() => {
    const map = new Map<string, string>()
    Object.entries(groupAvailability || {}).forEach(([groupKey, addresses]) => {
      addresses?.forEach(address => {
        if (address) map.set(address.toLowerCase(), groupKey)
      })
    })
    return map
  }, [groupAvailability])

  const allAvailaibility = useMemo(
    () => getMergedParticipants(participants, groups, groupAvailability),
    [participants, groups, groupAvailability, currentAccount?.address]
  )
  const allParticipants = useMemo(
    () => getMergedParticipants(participants, groups, groupAvailability),
    [participants, groups, groupAvailability, currentAccount?.address]
  )
  const toggleAvailability = (accountAddress: string) => {
    const addr = accountAddress.toLowerCase()
    const existingGroup = addressToGroupMap.get(addr)

    setGroupAvailability(prev => {
      if (existingGroup) {
        const nextGroup = (prev[existingGroup] || []).filter(
          a => a?.toLowerCase() !== addr
        )
        const next: Record<string, Array<string> | undefined> = {
          ...prev,
          [existingGroup]: nextGroup,
        }
        if (nextGroup.length === 0) delete next[existingGroup]
        return next
      }

      return {
        ...prev,
        [NO_GROUP_KEY]: [...(prev[NO_GROUP_KEY] || []), addr],
      }
    })
  }

  const removeParticipant = (participant: ParticipantInfo) => {
    const schedulerAddr = currentAccount?.address?.toLowerCase()
    const accountAddr = participant.account_address?.toLowerCase()
    const guestEmail = participant.guest_email?.toLowerCase()

    if (accountAddr) {
      if (schedulerAddr && accountAddr === schedulerAddr) {
        return
      }

      setParticipants(prev =>
        prev.filter(p => {
          if (isGroupParticipant(p)) return true
          return p.account_address?.toLowerCase() !== accountAddr
        })
      )

      setGroupAvailability(prev =>
        Object.fromEntries(
          Object.entries(prev)
            .map(([key, addresses]) => [
              key,
              (addresses || []).filter(a => a?.toLowerCase() !== accountAddr),
            ])
            .filter(([, addresses]) => addresses.length > 0)
        )
      )

      setGroupParticipants(prev =>
        Object.fromEntries(
          Object.entries(prev)
            .map(([key, addresses]) => [
              key,
              (addresses || []).filter(a => a?.toLowerCase() !== accountAddr),
            ])
            .filter(([, addresses]) => addresses.length > 0)
        )
      )

      return
    }

    if (guestEmail) {
      setParticipants(prev =>
        prev.filter(p => {
          if (isGroupParticipant(p)) return true
          return (p.guest_email || '').toLowerCase() !== guestEmail
        })
      )
    }
  }
  const value = {
    addGroup,
    allAvailaibility,
    allParticipants,
    contacts,
    groupAvailability,
    groupMembersAvailabilities,
    groupParticipants,
    groups,
    isContactsPrefetching,
    isGroupPrefetching,
    meetingMembers,
    meetingOwners,
    participants,
    removeGroup,
    removeParticipant,
    setGroupAvailability,
    setGroupMembersAvailabilities,
    setGroupParticipants,
    setGroups,
    setIsGroupPrefetching,
    setMeetingMembers,
    setMeetingOwners,
    setParticipants,
    setStandAloneParticipants,
    standAloneParticipants,
    toggleAvailability,
  }

  return (
    <ParticipantsContext.Provider value={value}>
      {children}
    </ParticipantsContext.Provider>
  )
}
