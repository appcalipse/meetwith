import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'

import { ChipInput } from '@/components/chip-input'
import PublicGroupLink from '@/components/group/PublicGroupLink'
import InfoTooltip from '@/components/profile/components/Tooltip'
import {
  IParticipantsContext,
  ParticipantsContext,
  useParticipants,
} from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  QuickPollBySlugResponse,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { IGroupParticipant, isGroupParticipant } from '@/types/schedule'
import { updateQuickPoll } from '@/utils/api_helper'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { handleApiError } from '@/utils/error_helper'
import { deduplicateArray } from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

import AddFromContact from './AddFromContact'
import AddFromGroups from './AddFromGroups'
import AllMeetingParticipants from './AllMeetingParticipants'

interface IProps {
  isOpen: boolean
  onClose: () => void
  isQuickPoll?: boolean
  pollData?: QuickPollBySlugResponse
  onInviteSuccess?: () => void
  participants: Array<ParticipantInfo | IGroupParticipant>
  groupParticipants: Record<string, Array<string> | undefined>
  groupAvailability: Record<string, Array<string> | undefined>

  handleUpdateParticipants: (
    participants: Array<ParticipantInfo | IGroupParticipant>
  ) => void
  handleUpdateGroups: (
    groupAvailability: Record<string, Array<string> | undefined>,
    groupParticipants: Record<string, Array<string> | undefined>
  ) => void
}

const InviteParticipants: FC<IProps> = ({
  isOpen,
  onClose,
  isQuickPoll,
  pollData,
  onInviteSuccess,
  handleUpdateParticipants,
  handleUpdateGroups,
  participants: defaultParticipantsInfo,
  groupParticipants: defaultGroupParticipants,
  groupAvailability: defaultGroupAvailability,
}) => {
  const {
    groups,
    setGroups,
    isGroupPrefetching,
    setIsGroupPrefetching,
    contacts,
    isContactsPrefetching,
    meetingMembers,
    meetingOwners,
    setMeetingMembers,
    setMeetingOwners,
    allAvailaibility,
    allParticipants,
    removeParticipant,
    toggleAvailability,
    groupMembersAvailabilities,
    setGroupMembersAvailabilities,
  } = useParticipants()
  const [standAloneParticipants, setStandAloneParticipants] = useState<
    Array<ParticipantInfo>
  >([])
  const [groupParticipants, setGroupParticipants] = useState<
    Record<string, Array<string> | undefined>
  >(defaultGroupParticipants)
  const [participants, setParticipants] = useState<
    Array<ParticipantInfo | IGroupParticipant>
  >(defaultParticipantsInfo)
  const [groupAvailability, setGroupAvailability] = useState<
    Record<string, Array<string> | undefined>
  >(defaultGroupAvailability)
  const groupId = useRouter().query.groupId as string | undefined
  const [isLoading, setIsLoading] = React.useState(false)
  const { showSuccessToast } = useToastHelpers()

  const [baselineIds, setBaselineIds] = useState<Set<string>>(new Set())
  const toIdentifier = (p: ParticipantInfo) =>
    (p.account_address || p.guest_email || '').toLowerCase()

  const combinedSelection = useMemo(() => {
    const merged = getMergedParticipants(
      participants ?? [],
      groups,
      groupParticipants ?? {},
      undefined
    )
    const fromContext = merged.filter(p => !!p.account_address)
    return [...fromContext, ...standAloneParticipants]
  }, [groupParticipants, groups, standAloneParticipants])

  const newInvitees = useMemo(() => {
    if (!baselineIds) return combinedSelection
    return combinedSelection.filter(p => {
      const id = toIdentifier(p)
      return !!id && !baselineIds.has(id)
    })
  }, [combinedSelection, baselineIds])

  useEffect(() => {
    if (isOpen) {
      const ids = new Set<string>()
      combinedSelection.forEach(p => {
        const id = toIdentifier(p)
        if (id) ids.add(id)
      })
      setBaselineIds(ids)
    } else {
      setBaselineIds(new Set())
    }
  }, [isOpen])

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

  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const addressesToAdd = _participants
        .map(p => p.account_address)
        .filter((a): a is string => !!a)

      setParticipants(prevUsers => {
        // Preserve both group participants AND contact participants
        const groupAndContactParticipants = prevUsers?.filter(user => {
          if (isGroupParticipant(user) || user.isHidden) return true
          // Check if this participant is from contacts
          if (user.account_address) {
            return Object.values(groupParticipants ?? {}).some(
              addresses =>
                addresses && addresses.includes(user.account_address!)
            )
          }
          return false
        })
        return [...groupAndContactParticipants, ..._participants]
      })
      setStandAloneParticipants(prevUsers => {
        // Preserve both group participants AND contact participants
        const groupAndContactParticipants = prevUsers?.filter(user => {
          if (isGroupParticipant(user) || user.isHidden) return true
          // Check if this participant is from contacts
          if (user.account_address) {
            return Object.values(groupParticipants ?? {}).some(
              addresses =>
                addresses && addresses.includes(user.account_address!)
            )
          }
          return false
        })
        return [...groupAndContactParticipants, ..._participants]
      })
      React.startTransition(() => {
        if (addressesToAdd.length > 0) {
          setGroupAvailability(prev => ({
            ...prev,
            [NO_GROUP_KEY]: deduplicateArray([
              ...(prev[NO_GROUP_KEY] || []),
              ...addressesToAdd,
            ]),
          }))

          setGroupParticipants(prev => ({
            ...prev,
            [NO_GROUP_KEY]: deduplicateArray([
              ...(prev[NO_GROUP_KEY] || []),
              ...addressesToAdd,
            ]),
          }))
        }
      })
    },
    [
      setParticipants,
      setGroupAvailability,
      setGroupParticipants,
      groupParticipants,
    ]
  )

  const handleQuickPollSaveChanges = useCallback(async () => {
    if (!pollData) return

    setIsLoading(true)
    try {
      if (newInvitees.length === 0) {
        setIsLoading(false)
        hanleClose()
        return
      }

      const toAdd = newInvitees.map(p => ({
        account_address: p.account_address,
        guest_name: p.name,
        guest_email: p.guest_email || '',
        participant_type: QuickPollParticipantType.INVITEE,
        status: QuickPollParticipantStatus.ACCEPTED,
      }))

      await updateQuickPoll(pollData.poll.id, {
        participants: { toAdd },
      })

      showSuccessToast(
        'Participants added successfully',
        `${toAdd.length} participant${toAdd.length > 1 ? 's' : ''} ${
          toAdd.length === 1 ? 'has' : 'have'
        } been added to the poll.`
      )

      onInviteSuccess?.()
      hanleClose()
    } catch (error) {
      handleApiError('Failed to add participants', error)
    } finally {
      setIsLoading(false)
    }
  }, [pollData, newInvitees, onInviteSuccess, showSuccessToast])
  const hanleClose = () => {
    handleUpdateParticipants(participants)
    handleUpdateGroups(groupAvailability, groupParticipants)
    onClose()
  }
  const handleSaveChangesClick = useCallback(() => {
    if (isQuickPoll) {
      void handleQuickPollSaveChanges()
    } else {
      hanleClose()
    }
  }, [isQuickPoll, handleQuickPollSaveChanges, hanleClose])
  const renderParticipantItem = useCallback((p: ParticipantInfo) => {
    if (p.account_address) {
      return p.name || ellipsizeAddress(p.account_address)
    } else if (p.name && p.guest_email) {
      return `${p.name} - ${p.guest_email}`
    } else if (p.name) {
      return p.name
    } else {
      return p.guest_email!
    }
  }, [])
  const context: IParticipantsContext = {
    participants,
    standAloneParticipants,
    groupParticipants,
    groupAvailability,
    groupMembersAvailabilities,
    meetingMembers,
    meetingOwners,
    groups,
    setGroups,
    isGroupPrefetching,
    setParticipants,
    setGroupParticipants,
    setGroupAvailability,
    setGroupMembersAvailabilities,
    setMeetingMembers,
    setMeetingOwners,
    setIsGroupPrefetching,
    addGroup,
    removeGroup,
    contacts,
    isContactsPrefetching,
    setStandAloneParticipants,
    allAvailaibility,
    allParticipants,
    removeParticipant,
    toggleAvailability,
  }
  return (
    <ParticipantsContext.Provider value={context}>
      <Modal isOpen={isOpen} onClose={hanleClose} isCentered>
        <ModalOverlay bg="#131A20CC" backdropFilter={'blur(25px)'} />
        <ModalContent
          maxWidth={{ base: '100%', md: '500px' }}
          width={{ base: '100%', md: '500px' }}
          borderWidth={1}
          bg="bg-surface"
          borderColor="border-default"
          py={6}
          shadow="none"
          height={{ base: '100vh', md: 'auto' }}
          minH={{ base: '100vh', md: 'auto' }}
          maxH={{ base: '100vh', md: '95vh' }}
          borderRadius={{ base: 0, md: 'md' }}
          overflowY="scroll"
        >
          <ModalCloseButton />
          <ModalBody>
            <Heading fontSize="22px" pb={2} mb={4}>
              Meeting participants
            </Heading>
            <AllMeetingParticipants />
            <Divider my={6} borderColor="neutral.400" />
            <Heading fontSize="22px" pb={2} mb={4}>
              Add participants from groups/contacts
            </Heading>
            <AddFromGroups />
            <Divider my={6} borderColor="neutral.400" />
            <AddFromContact />

            {!isQuickPoll && (
              <>
                <Divider my={6} borderColor="neutral.400" />
                <FormControl w="100%" maxW="100%">
                  <FormLabel htmlFor="participants">
                    Invite participants by their ID (Cc)
                    <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
                  </FormLabel>
                  <Box w="100%" maxW="100%">
                    <ChipInput
                      currentItems={standAloneParticipants}
                      placeholder="Enter email, wallet address or ENS of user"
                      onChange={onParticipantsChange}
                      renderItem={renderParticipantItem}
                    />
                  </Box>
                  <FormHelperText mt={1}>
                    <Text fontSize="12px" color="neutral.400">
                      Separate participants by comma. You will be added
                      automatically, no need to insert yourself
                    </Text>
                  </FormHelperText>
                </FormControl>
              </>
            )}

            <Button
              mt={6}
              w="fit-content"
              colorScheme="primary"
              onClick={handleSaveChangesClick}
              isLoading={isQuickPoll ? isLoading : false}
              isDisabled={isQuickPoll ? isLoading : false}
            >
              Save Changes
            </Button>

            {groupId && (
              <Box mt={6}>
                <PublicGroupLink groupId={groupId} />
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </ParticipantsContext.Provider>
  )
}

export default InviteParticipants
