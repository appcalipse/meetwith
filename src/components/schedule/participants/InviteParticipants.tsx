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
import React, { FC, useCallback } from 'react'

import { ChipInput } from '@/components/chip-input'
import PublicGroupLink from '@/components/group/PublicGroupLink'
import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { QuickPollParticipantType } from '@/types/QuickPoll'
import { isGroupParticipant } from '@/types/schedule'
import { addQuickPollParticipants } from '@/utils/api_helper'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { handleApiError } from '@/utils/error_helper'
import { deduplicateArray } from '@/utils/generic_utils'
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
  } = useParticipants()
  const groupId = useRouter().query.groupId as string | undefined
  const [isLoading, setIsLoading] = React.useState(false)
  const { showSuccessToast } = useToastHelpers()

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

  const handleQuickPollSendInvite = useCallback(async () => {
    if (!pollData || standAloneParticipants.length === 0) return

    setIsLoading(true)
    try {
      const participants = standAloneParticipants.map(p => ({
        account_address: p.account_address,
        guest_name: p.name,
        guest_email: p.guest_email || '',
        participant_type: QuickPollParticipantType.INVITEE,
      }))

      await addQuickPollParticipants(pollData.poll.id, participants)

      showSuccessToast(
        'Invitations sent successfully',
        `${participants.length} participant${
          participants.length > 1 ? 's' : ''
        } ${
          participants.length === 1 ? 'has' : 'have'
        } been invited to the poll.`
      )

      onInviteSuccess?.()
      onClose()
    } catch (error) {
      handleApiError('Failed to send invitations', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    pollData,
    standAloneParticipants,
    onInviteSuccess,
    onClose,
    showSuccessToast,
  ])
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
        maxWidth="500px"
        width="500px"
        borderWidth={1}
        bg="bg-surface"
        borderColor="border-default"
        py={6}
        shadow="none"
      >
        <ModalCloseButton />
        <ModalBody>
          <AllMeetingParticipants />
          <Divider my={6} borderColor="neutral.400" />
          <Heading fontSize="24px" pb={2} mb={4}>
            Invite more participants
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
                Separate participants by comma. You will be added automatically,
                no need to insert yourself
              </Text>
            </FormHelperText>
          </FormControl>

          {isQuickPoll && (
            <Button
              mt={6}
              w="fit-content"
              colorScheme="primary"
              onClick={handleQuickPollSendInvite}
              isLoading={isLoading}
              isDisabled={standAloneParticipants.length === 0}
            >
              Send Invite
            </Button>
          )}

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
