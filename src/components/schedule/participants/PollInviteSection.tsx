import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useCallback } from 'react'
import { LuLink2 } from 'react-icons/lu'

import { ChipInput } from '@/components/chip-input'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import {
  QuickPollBySlugResponse,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import { appUrl } from '@/utils/constants'
import { useToastHelpers } from '@/utils/toasts'
import { ellipsizeAddress } from '@/utils/user_manager'

import AddFromContact from './AddFromContact'

interface PollInviteSectionProps {
  pollData?: QuickPollBySlugResponse
  inviteParticipants: Array<ParticipantInfo>
  onInviteParticipantsChange: (participants: Array<ParticipantInfo>) => void
  onSendInvite: () => void
  isLoading: boolean
  isDisabled: boolean
  onRequestSignIn?: () => void
}

const PollInviteSection: FC<PollInviteSectionProps> = ({
  pollData,
  inviteParticipants,
  onInviteParticipantsChange,
  onSendInvite,
  isLoading,
  isDisabled,
  onRequestSignIn,
}) => {
  const { showSuccessToast, showErrorToast } = useToastHelpers()

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

  const handlePollLinkCopy = useCallback(async () => {
    if (!pollData) return
    try {
      const pollLink = `${appUrl}/poll/${pollData.poll.slug}`
      await navigator.clipboard.writeText(pollLink)
      showSuccessToast('Link copied', 'Poll invite link copied to clipboard.')
    } catch (_e) {
      showErrorToast('Error copying link', 'Please try again.')
    }
  }, [pollData, showSuccessToast, showErrorToast])

  return (
    <>
      <Heading fontSize="22px" pb={2} mb={4}>
        Add participants from contacts
      </Heading>
      <AddFromContact isQuickPoll={true} onRequestSignIn={onRequestSignIn} />
      <Divider my={6} borderColor="neutral.400" />
      <FormControl w="100%" maxW="100%">
        <FormLabel htmlFor="invite-participants">
          Invite participants by their ID (Cc)
          <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
        </FormLabel>
        <Box w="100%" maxW="100%">
          <ChipInput
            currentItems={inviteParticipants}
            placeholder="Enter email, wallet address, or ENS of user"
            onChange={onInviteParticipantsChange}
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
        onClick={onSendInvite}
        isLoading={isLoading}
        isDisabled={isDisabled}
      >
        {pollData ? 'Send Invites' : 'Save changes'}
      </Button>
      {pollData && (
        <>
          <Divider my={6} borderColor="neutral.400" />
          <VStack alignItems="flex-start" fontWeight={500} w="100%">
            <Text fontSize="lg">Poll Invite link</Text>
            <VStack
              gap={3}
              bg="neutral.700"
              borderWidth={1}
              borderColor="neutral.400"
              py={4}
              px={5}
              alignItems="flex-start"
              borderRadius="6px"
              w="100%"
            >
              <Text>
                To invite others to the poll, share this link with them.
              </Text>
              <HStack cursor="pointer" onClick={handlePollLinkCopy} spacing={2}>
                <IconButton
                  aria-label="Copy link"
                  icon={<LuLink2 size={24} color="#2D3748" />}
                  p={1}
                  h="auto"
                  bg="#E6E6E6"
                />
                <Text>Copy link to share</Text>
              </HStack>
            </VStack>
          </VStack>
        </>
      )}
    </>
  )
}

export default PollInviteSection
