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
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'

import { ChipInput } from '@/components/chip-input'
import PublicGroupLink from '@/components/group/PublicGroupLink'
import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { isGroupParticipant } from '@/types/schedule'
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
  pollData?: any
  onInviteSuccess?: () => void
}

const InviteParticipants: FC<IProps> = ({
  isOpen,
  onClose,
  isQuickPoll,
  pollData,
  onInviteSuccess,
}) => {
  const {
    groups,
    isGroupPrefetching,
    setParticipants,
    setGroupAvailability,
    setGroupParticipants,
    setStandAloneParticipants,
    standAloneParticipants,
    participants: contextParticipants,
    groupParticipants: contextGroupParticipants,
  } = useParticipants()
  const groupId = useRouter().query.groupId as string | undefined
  const [isLoading, setIsLoading] = React.useState(false)
  const { showSuccessToast } = useToastHelpers()

  const [baselineIds, setBaselineIds] = useState<Set<string>>(new Set())
  const toIdentifier = (p: ParticipantInfo) =>
    (p.account_address || p.guest_email || '').toLowerCase()

  const combinedSelection = useMemo(() => {
    const merged = getMergedParticipants(
      contextParticipants ?? [],
      groups,
      contextGroupParticipants ?? {},
      undefined
    )
    const fromContext = merged.filter(p => !!p.account_address)
    return [...fromContext, ...standAloneParticipants]
  }, [
    contextParticipants,
    groups,
    contextGroupParticipants,
    standAloneParticipants,
  ])

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

  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const addressesToAdd = _participants
        .map(p => p.account_address)
        .filter((a): a is string => !!a)

      setParticipants(prevUsers => {
        const groupParticipants = prevUsers?.filter(
          user => isGroupParticipant(user) || user.isHidden
        )
        return [...groupParticipants, ..._participants]
      })
      setStandAloneParticipants(prevUsers => {
        const groupParticipants = prevUsers?.filter(
          user => isGroupParticipant(user) || user.isHidden
        )
        return [...groupParticipants, ..._participants]
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
    [setParticipants, setGroupAvailability, setGroupParticipants]
  )

  const handleQuickPollSaveChanges = useCallback(async () => {
    if (!pollData) return

    setIsLoading(true)
    try {
      if (newInvitees.length === 0) {
        setIsLoading(false)
        onClose()
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
      onClose()
    } catch (error) {
      handleApiError('Failed to add participants', error)
    } finally {
      setIsLoading(false)
    }
  }, [pollData, newInvitees, onInviteSuccess, onClose, showSuccessToast])

  const handleSaveChangesClick = useCallback(() => {
    if (isQuickPoll) {
      void handleQuickPollSaveChanges()
    } else {
      onClose()
    }
  }, [isQuickPoll, handleQuickPollSaveChanges, onClose])
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
        borderRadius={{ base: 0, md: 'md' }}
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
          {isGroupPrefetching ? (
            <VStack mb={6} w="100%" justifyContent="center">
              <Loading />
            </VStack>
          ) : groups.length > 0 ? (
            <AddFromGroups />
          ) : (
            <Text>No groups available. Please create a group first.</Text>
          )}
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
  )
}

export default InviteParticipants
