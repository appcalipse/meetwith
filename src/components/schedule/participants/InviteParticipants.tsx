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
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ChipInput } from '@/components/chip-input'
import PublicGroupLink from '@/components/group/PublicGroupLink'
import InfoTooltip from '@/components/profile/components/Tooltip'
import useAccountContext from '@/hooks/useAccountContext'
import {
  IParticipantsContext,
  ParticipantsContext,
  useParticipants,
} from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  QuickPollBulkAddParticipants,
  QuickPollBySlugResponse,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { IGroupParticipant, isGroupParticipant } from '@/types/schedule'
import {
  addQuickPollParticipantsBySlugAsGuest,
  updateQuickPoll,
} from '@/utils/api_helper'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { handleApiError } from '@/utils/error_helper'
import { deduplicateArray } from '@/utils/generic_utils'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

import AddFromContact from './AddFromContact'
import AddFromGroups from './AddFromGroups'
import AllMeetingParticipants from './AllMeetingParticipants'
import PollInviteSection from './PollInviteSection'

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
  const currentAccount = useAccountContext()
  const {
    group,
    setGroup,
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
  const [inviteParticipants, setInviteParticipants] = useState<
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
  const baselineInitializedRef = useRef(false)
  const prevIsOpenRef = useRef(isOpen)
  const prevInviteIdsRef = useRef<Set<string>>(new Set())
  const toIdentifier = useCallback(
    (p: ParticipantInfo | IGroupParticipant): string => {
      if (isGroupParticipant(p)) {
        return ''
      }
      return (p.account_address || p.guest_email || '').toLowerCase()
    },
    []
  )

  const addParticipantsAsGuestMutation = useMutation({
    mutationFn: async (input: {
      slug: string
      participants: QuickPollBulkAddParticipants
    }) => {
      return await addQuickPollParticipantsBySlugAsGuest(
        input.slug,
        input.participants
      )
    },
  })

  const combinedSelection = useMemo(() => {
    if (isQuickPoll) {
      const fromContacts = participants.filter(
        (p): p is ParticipantInfo =>
          !isGroupParticipant(p) && !!p.account_address
      )
      return [...fromContacts, ...inviteParticipants]
    }
    const merged = getMergedParticipants(
      participants ?? [],
      groupParticipants ?? {},
      group,
      undefined
    )
    const fromContext = merged.filter(
      (p): p is ParticipantInfo => !!(p.account_address || p.guest_email)
    )
    return [...fromContext, ...standAloneParticipants]
  }, [
    groupParticipants,
    group,
    standAloneParticipants,
    inviteParticipants,
    participants,
    isQuickPoll,
  ])

  const newInvitees = useMemo(() => {
    if (!baselineIds) return combinedSelection
    return combinedSelection.filter((p): p is ParticipantInfo => {
      const id = toIdentifier(p)
      return !!id && !baselineIds.has(id)
    })
  }, [combinedSelection, baselineIds, toIdentifier])

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current

    if (isOpen && !wasOpen) {
      setParticipants(defaultParticipantsInfo)
      setGroupParticipants(defaultGroupParticipants)
      setGroupAvailability(defaultGroupAvailability)
      setInviteParticipants([])
      prevInviteIdsRef.current = new Set()

      const ids = new Set<string>()
      defaultParticipantsInfo.forEach(p => {
        const id = toIdentifier(p)
        if (id) ids.add(id)
      })

      setBaselineIds(ids)
      baselineInitializedRef.current = true
    }
    if (!isOpen && wasOpen) {
      setBaselineIds(new Set())
      baselineInitializedRef.current = false
    }

    prevIsOpenRef.current = isOpen
  }, [
    isOpen,
    defaultParticipantsInfo,
    defaultGroupParticipants,
    defaultGroupAvailability,
    toIdentifier,
  ])

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

      setStandAloneParticipants(prevStandalone => {
        // Get IDs of previously standalone participants
        const prevStandaloneIds = new Set(
          prevStandalone
            .map(
              p =>
                p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
            )
            .filter((id): id is string => !!id)
        )

        // Update participants by removing old standalone and adding new ones
        setParticipants(prev => {
          // Remove participants that were in prevStandalone but not in _participants
          const filtered = prev.filter(p => {
            if (isGroupParticipant(p)) return true
            const id =
              p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
            return !id || !prevStandaloneIds.has(id)
          })

          const existingIds = new Set(
            filtered
              .filter((p): p is ParticipantInfo => !isGroupParticipant(p))
              .map(
                p =>
                  p.account_address?.toLowerCase() ||
                  p.guest_email?.toLowerCase()
              )
              .filter((id): id is string => !!id)
          )

          const toAdd = _participants.filter(p => {
            const id =
              p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
            return id && !existingIds.has(id)
          })
          return [...filtered, ...toAdd]
        })

        return _participants
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
    if (!pollData) {
      hanleClose()
      return
    }

    // For existing polls, add participants and send invites
    setIsLoading(true)
    try {
      const allToAdd = currentAccount
        ? [
            ...newInvitees.filter(
              (p): p is ParticipantInfo => !!p.account_address
            ),
            ...inviteParticipants,
          ]
        : inviteParticipants

      if (allToAdd.length === 0) {
        setIsLoading(false)
        hanleClose()
        return
      }

      const toAdd = allToAdd.map(p => ({
        account_address: p.account_address,
        guest_name: p.name,
        guest_email: p.guest_email || '',
        participant_type: QuickPollParticipantType.INVITEE,
        status: p.account_address
          ? QuickPollParticipantStatus.ACCEPTED
          : QuickPollParticipantStatus.PENDING,
      }))

      if (currentAccount) {
        await updateQuickPoll(pollData.poll.id, {
          participants: { toAdd },
        })
      } else {
        await addParticipantsAsGuestMutation.mutateAsync({
          slug: pollData.poll.slug,
          participants: toAdd,
        })
      }

      showSuccessToast('invite(s) sent successfully', '')

      setInviteParticipants([])
      onInviteSuccess?.()
      hanleClose()
    } catch (error) {
      handleApiError('Failed to add participants', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    pollData,
    newInvitees,
    inviteParticipants,
    currentAccount,
    onInviteSuccess,
    showSuccessToast,
  ])
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

  const onInviteParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      setInviteParticipants(_participants)

      const newInviteIds = new Set(
        _participants
          .map(
            p =>
              p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
          )
          .filter((id): id is string => !!id)
      )

      const removedIds = new Set(
        [...prevInviteIdsRef.current].filter(id => !newInviteIds.has(id))
      )

      setParticipants(prev => {
        const filtered = prev.filter(p => {
          if (isGroupParticipant(p)) return true
          const id =
            p.account_address?.toLowerCase() ||
            p.guest_email?.toLowerCase() ||
            ''
          return !removedIds.has(id)
        })

        const existingIds = new Set(
          filtered
            .filter((p): p is ParticipantInfo => !isGroupParticipant(p))
            .map(
              p =>
                p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
            )
            .filter((id): id is string => !!id)
        )

        const newParticipantsToAdd = _participants.filter(p => {
          const id =
            p.account_address?.toLowerCase() || p.guest_email?.toLowerCase()
          return id && !existingIds.has(id)
        })

        return [...filtered, ...newParticipantsToAdd]
      })

      prevInviteIdsRef.current = newInviteIds
    },
    []
  )
  const context: IParticipantsContext = {
    participants,
    standAloneParticipants,
    groupParticipants,
    groupAvailability,
    groupMembersAvailabilities,
    meetingMembers,
    meetingOwners,
    group,
    setGroup,
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
            {isQuickPoll ? (
              <PollInviteSection
                pollData={pollData}
                inviteParticipants={inviteParticipants}
                onInviteParticipantsChange={onInviteParticipantsChange}
                onSendInvite={handleSaveChangesClick}
                isLoading={isLoading}
                isDisabled={
                  isLoading ||
                  (newInvitees.filter(
                    (p): p is ParticipantInfo => !!p.account_address
                  ).length === 0 &&
                    inviteParticipants.length === 0)
                }
                onRequestSignIn={onClose}
              />
            ) : (
              <>
                <AddFromGroups />
                <AddFromContact />
                <Divider my={6} borderColor="neutral.400" />
                <FormControl w="100%" maxW="100%">
                  <FormLabel htmlFor="participants">
                    Invite participants by their ID (Cc)
                    <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
                  </FormLabel>
                  <Box w="100%" maxW="100%">
                    <ChipInput
                      currentItems={standAloneParticipants}
                      inputProps={{ 'data-testid': 'invite-modal-input' } as never}
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
                <Button
                  data-testid="invite-modal-save"
                  mt={6}
                  w="fit-content"
                  colorScheme="primary"
                  onClick={handleSaveChangesClick}
                >
                  Save Changes
                </Button>
                {groupId && (
                  <Box mt={6}>
                    <PublicGroupLink groupId={groupId} />
                  </Box>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </ParticipantsContext.Provider>
  )
}

export default InviteParticipants
