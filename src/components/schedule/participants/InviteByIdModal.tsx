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
import React, { FC, useCallback, useState } from 'react'

import { ChipInput } from '@/components/chip-input'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  QuickPollBySlugResponse,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { updateQuickPoll } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

interface IProps {
  isOpen: boolean
  onClose: () => void
  pollData?: QuickPollBySlugResponse
  onInviteSuccess?: () => void
}

const InviteByIdModal: FC<IProps> = ({
  isOpen,
  onClose,
  pollData,
  onInviteSuccess,
}) => {
  const [inviteParticipants, setInviteParticipants] = useState<
    Array<ParticipantInfo>
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccessToast } = useToastHelpers()

  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      setInviteParticipants(_participants)
    },
    []
  )

  const handleSendInvite = useCallback(async () => {
    if (!pollData) return

    setIsLoading(true)
    try {
      if (inviteParticipants.length === 0) {
        setIsLoading(false)
        return
      }

      const toAdd = inviteParticipants.map(p => ({
        account_address: p.account_address,
        guest_name: p.name,
        guest_email: p.guest_email || '',
        participant_type: QuickPollParticipantType.INVITEE,
      }))

      await updateQuickPoll(pollData.poll.id, {
        participants: { toAdd },
      })

      showSuccessToast(
        'Invitations sent successfully',
        `${toAdd.length} participant${toAdd.length > 1 ? 's' : ''} ${
          toAdd.length === 1 ? 'has' : 'have'
        } been invited to the poll.`
      )

      setInviteParticipants([])
      onInviteSuccess?.()
      onClose()
    } catch (error) {
      handleApiError('Failed to send invitation', error)
    } finally {
      setIsLoading(false)
    }
  }, [pollData, inviteParticipants, onInviteSuccess, onClose, showSuccessToast])

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

  const handleClose = useCallback(() => {
    setInviteParticipants([])
    onClose()
  }, [onClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
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
          <Heading fontSize="24px" pb={2} mb={4}>
            Invite participants by ID
          </Heading>
          <Divider my={6} borderColor="neutral.400" />
          <FormControl w="100%" maxW="100%">
            <FormLabel htmlFor="participants">
              Invite participants by their ID (Cc)
              <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
            </FormLabel>
            <Box w="100%" maxW="100%">
              <ChipInput
                currentItems={inviteParticipants}
                placeholder="Enter email, wallet address, or ENS of user"
                onChange={onParticipantsChange}
                renderItem={renderParticipantItem}
              />
            </Box>
            <FormHelperText mt={1}>
              <Text fontSize="12px" color="neutral.400">
                Tap to enter. No need to add yourself.
              </Text>
            </FormHelperText>
          </FormControl>

          <Button
            mt={6}
            w="fit-content"
            colorScheme="primary"
            onClick={handleSendInvite}
            isLoading={isLoading}
            isDisabled={isLoading || inviteParticipants.length === 0}
          >
            Send Invite
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default InviteByIdModal
