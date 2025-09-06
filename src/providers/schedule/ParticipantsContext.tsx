import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

import { Account } from '@/types/Account'
import { GetGroupsFullResponse } from '@/types/Group'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { IGroupParticipant, isGroupParticipant } from '@/types/schedule'
import { getGroupsFull } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

interface IParticipantsContext {
  participants: Array<ParticipantInfo | IGroupParticipant>
  groupParticipants: Record<string, Array<string>>
  groupAvailability: Record<string, Array<string>>
  meetingMembers: Array<Account>
  meetingOwners: Array<ParticipantInfo>
  groups: Array<GetGroupsFullResponse>
  isGroupPrefetching: boolean
  setGroups: React.Dispatch<React.SetStateAction<Array<GetGroupsFullResponse>>>
  setParticipants: React.Dispatch<
    React.SetStateAction<Array<ParticipantInfo | IGroupParticipant>>
  >
  setGroupParticipants: React.Dispatch<
    React.SetStateAction<Record<string, Array<string>>>
  >
  setGroupAvailability: React.Dispatch<
    React.SetStateAction<Record<string, Array<string>>>
  >
  setMeetingMembers: React.Dispatch<React.SetStateAction<Array<Account>>>
  setMeetingOwners: React.Dispatch<React.SetStateAction<Array<ParticipantInfo>>>
  setIsGroupPrefetching: React.Dispatch<React.SetStateAction<boolean>>
  addGroup: (group: IGroupParticipant) => void
  removeGroup: (groupId: string) => void
}

const ParticipantsContext = createContext<IParticipantsContext | undefined>(
  undefined
)

export const useParticipants = () => {
  const context = useContext(ParticipantsContext)
  if (!context) {
    throw new Error('useParticipants must be used within ParticipantsProvider')
  }
  return context
}

interface ParticipantsProviderProps {
  children: ReactNode
}

export const ParticipantsProvider: React.FC<ParticipantsProviderProps> = ({
  children,
}) => {
  const [participants, setParticipants] = useState<
    Array<ParticipantInfo | IGroupParticipant>
  >([])
  const [groupParticipants, setGroupParticipants] = useState<
    Record<string, Array<string>>
  >({})
  const [groupAvailability, setGroupAvailability] = useState<
    Record<string, Array<string>>
  >({})
  const [meetingMembers, setMeetingMembers] = useState<Array<Account>>([])
  const [meetingOwners, setMeetingOwners] = useState<Array<ParticipantInfo>>([])
  const [groups, setGroups] = useState<Array<GetGroupsFullResponse>>([])
  const [isGroupPrefetching, setIsGroupPrefetching] = useState(false)

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

  useEffect(() => {
    void fetchGroups()
  }, [])
  const value = {
    participants,
    groupParticipants,
    groupAvailability,
    meetingMembers,
    meetingOwners,
    groups,
    setGroups,
    isGroupPrefetching,
    setParticipants,
    setGroupParticipants,
    setGroupAvailability,
    setMeetingMembers,
    setMeetingOwners,
    setIsGroupPrefetching,
    addGroup,
    removeGroup,
  }

  return (
    <ParticipantsContext.Provider value={value}>
      {children}
    </ParticipantsContext.Provider>
  )
}
