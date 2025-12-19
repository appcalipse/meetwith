import { IconButton } from '@chakra-ui/button'
import { FormControl, FormLabel } from '@chakra-ui/form-control'
import { CheckIcon } from '@chakra-ui/icons'
import { Badge, Box, Center, HStack, Link, VStack } from '@chakra-ui/layout'
import { Tooltip } from '@chakra-ui/react'
import * as React from 'react'
import { BsDash } from 'react-icons/bs'
import { FaTimes } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { IoPersonAddOutline } from 'react-icons/io5'

import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { useParticipantPermissions } from '@/providers/schedule/PermissionsContext'
import { Account } from '@/types/Account'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import ParticipantService from '@/utils/participant.service'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

import { ChipInput } from '../chip-input'
import { chipStyles } from '../chip-input/chip'

interface ParticipantsControlProps {
  currentAccount: Account
  openInviteModal: () => void
}
const renderRsvpStatus = (status: ParticipationStatus) => {
  switch (status) {
    case ParticipationStatus.Accepted:
      return (
        <Tooltip label="Accepted" placement="top">
          <VStack
            as="span"
            w={3}
            h={3}
            bg="green.500"
            rounded="full"
            justify="center"
            align="center"
            mr={1}
          >
            <CheckIcon width={'8px'} height={'8px'} />
          </VStack>
        </Tooltip>
      )
    case ParticipationStatus.Rejected:
      return (
        <Tooltip label="Rejected" placement="top">
          <VStack
            as="span"
            w={3}
            h={3}
            bg="red.250"
            rounded="full"
            justify="center"
            align="center"
            mr={1}
          >
            <FaX size={8} />
          </VStack>
        </Tooltip>
      )
    case ParticipationStatus.Pending:
      return (
        <Tooltip label="Pending" placement="top">
          <VStack
            as="span"
            w={3}
            h={3}
            bg="#FF8D28"
            rounded="full"
            justify="center"
            align="center"
            mr={1}
          >
            <BsDash width={'8px'} height={'8px'} />
          </VStack>
        </Tooltip>
      )
  }
}

const ParticipantsControl: React.FC<ParticipantsControlProps> = ({
  currentAccount,
  openInviteModal,
}) => {
  const { canEditMeetingParticipants } = useParticipantPermissions()

  const {
    setGroupParticipants,
    setGroupAvailability,
    setParticipants,
    groups,
    groupParticipants,
    participants,
  } = useParticipants()
  const renderParticipantChipLabel = React.useCallback(
    (participantInfo: ParticipantInfo) => {
      const isParticipantScheduler =
        participantInfo.type === ParticipantType.Scheduler
      const isCurrentUser =
        participantInfo.account_address &&
        participantInfo.account_address.toLowerCase() ===
          currentAccount?.address?.toLowerCase()

      if (isParticipantScheduler) {
        if (isCurrentUser) {
          return 'You (Scheduler)'
        }
        const baseName =
          participantInfo.name ||
          participantInfo.guest_email ||
          ellipsizeAddress(participantInfo.account_address || '')
        return `${baseName} (Scheduler)`
      }

      return (
        participantInfo.name ||
        participantInfo.guest_email ||
        ellipsizeAddress(participantInfo.account_address || '')
      )
    },
    [currentAccount?.address]
  )
  const renderBadge = React.useCallback(
    (participantInfo: ParticipantInfo, onRemove?: () => void) => (
      <Badge
        sx={chipStyles.badge}
        key={participantInfo.account_address || participantInfo.guest_email}
      >
        <Center>
          {renderRsvpStatus(participantInfo.status)}
          {renderParticipantChipLabel(participantInfo)}
          {canEditMeetingParticipants && (
            <Link
              sx={chipStyles.close}
              size={'xs'}
              variant={'unstyled'}
              aria-label={`Remove Entry`}
              onClick={onRemove}
            >
              <FaTimes />
            </Link>
          )}
        </Center>
      </Badge>
    ),
    [renderParticipantChipLabel]
  )
  const displayParticipants = React.useMemo(() => {
    const seenIdentifiers = new Set<string>()
    const meetingParticipants = getMergedParticipants(
      participants,
      groups,
      groupParticipants
    )
    return meetingParticipants.reduce<Array<ParticipantInfo>>(
      (accumulator, participant) => {
        const participantInfo = participant
        const identifier =
          participantInfo.account_address?.toLowerCase() ||
          participantInfo.guest_email?.toLowerCase() ||
          participantInfo.name?.toLowerCase()

        if (identifier) {
          if (seenIdentifiers.has(identifier)) {
            return accumulator
          }
          seenIdentifiers.add(identifier)
        }

        if (participantInfo.isHidden) {
          accumulator.push({
            ...participantInfo,
            isHidden: false,
          })
          return accumulator
        }

        accumulator.push(participantInfo)
        return accumulator
      },
      []
    )
  }, [participants, groupParticipants, groups])
  const handleChipInputChange = React.useCallback(
    (updatedItems: ParticipantInfo[]) => {
      if (!canEditMeetingParticipants) return

      const participantService = new ParticipantService(
        displayParticipants,
        updatedItems
      )

      React.startTransition(() => {
        setGroupParticipants(prev => participantService.handleDerivatives(prev))
        setGroupAvailability(prev => participantService.handleDerivatives(prev))
        setParticipants(prev =>
          participantService.handleParticipantUpdate(prev)
        )
      })
    },
    [canEditMeetingParticipants, displayParticipants]
  )

  return (
    <FormControl>
      <FormLabel>Meeting participants</FormLabel>
      <HStack alignItems="stretch" gap={3}>
        <Box width="fit-content" flex={1}>
          <ChipInput
            currentItems={displayParticipants || []}
            onChange={handleChipInputChange}
            renderItem={participant => renderParticipantChipLabel(participant)}
            placeholder="Add participants"
            addDisabled={!canEditMeetingParticipants}
            isReadOnly={!canEditMeetingParticipants}
            renderBadge={renderBadge}
            inputProps={
              !canEditMeetingParticipants
                ? {
                    display: 'none',
                  }
                : undefined
            }
          />
        </Box>
        {canEditMeetingParticipants && (
          <IconButton
            aria-label="Add participants"
            icon={<IoPersonAddOutline size={20} />}
            onClick={openInviteModal}
            isDisabled={!canEditMeetingParticipants}
            bg="primary.200"
            color="neutral.900"
            borderRadius="6px"
            _hover={{
              bg: 'primary.300',
            }}
          />
        )}
      </HStack>
    </FormControl>
  )
}

export default ParticipantsControl
