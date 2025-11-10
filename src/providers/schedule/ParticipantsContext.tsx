import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { Account } from '@/types/Account'
import { LeanContact } from '@/types/Contacts'
import { GetGroupsFullResponse } from '@/types/Group'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { IGroupParticipant, isGroupParticipant } from '@/types/schedule'
import { getContactsLean, getGroupsFull } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'

interface IParticipantsContext {
  participants: Array<ParticipantInfo | IGroupParticipant>
  standAloneParticipants: Array<ParticipantInfo>
  groupParticipants: Record<string, Array<string> | undefined>
  groupAvailability: Record<string, Array<string> | undefined>
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
      name: currentAccount?.preferences?.name,
      type: ParticipantType.Scheduler,
      status: ParticipationStatus.Accepted,
      slot_id: '',
      meeting_id: '',
      isHidden: true,
    },
  ])

  const [standAloneParticipants, setStandAloneParticipants] = useState<
    Array<ParticipantInfo>
  >([])
  const [groupParticipants, setGroupParticipants] = useState<
    Record<string, Array<string> | undefined>
  >({})
  const [groupAvailability, setGroupAvailability] = useState<
    Record<string, Array<string> | undefined>
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
  const value = {
    participants,
    standAloneParticipants,
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
    contacts,
    isContactsPrefetching,
    setStandAloneParticipants,
  }

  return (
    <ParticipantsContext.Provider value={value}>
      {children}
    </ParticipantsContext.Provider>
  )
}
