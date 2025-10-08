import {
  Box,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { FC, useCallback, useMemo, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'

import { ChipInput } from '@/components/chip-input'
import GroupContactModal from '@/components/contact/GroupContactModal'
import PublicGroupLink from '@/components/group/PublicGroupLink'
import Loading from '@/components/Loading'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { LeanContact } from '@/types/Contacts'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { deduplicateArray } from '@/utils/generic_utils'
import { ellipsizeAddress } from '@/utils/user_manager'

import AddFromContact from './AddFromContact'
import AddFromGroups from './AddFromGroups'
interface IProps {
  isOpen: boolean
  onClose: () => void
}

const InviteParticipants: FC<IProps> = ({ isOpen, onClose }) => {
  const {
    groups,
    isGroupPrefetching,
    participants,
    setParticipants,
    setGroupAvailability,
    setGroupParticipants,
  } = useParticipants()
  const groupId = useRouter().query.groupId as string | undefined

  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const addressesToAdd = _participants
        .map(p => p.account_address)
        .filter((a): a is string => !!a)

      React.startTransition(() => {
        setParticipants(prevUsers => {
          const groupParticipants = prevUsers?.filter(
            user => isGroupParticipant(user) || user.isHidden
          )
          return [...groupParticipants, ..._participants]
        })

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
  const nonGroupParticipants = useMemo(
    () =>
      participants.filter(
        participant => !isGroupParticipant(participant) && !participant.isHidden
      ),
    [participants]
  )

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
        <ModalHeader fontSize="24px" py={0}>
          Invite Participants
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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
              Participants
              <Text color="red.500" display="inline">
                *
              </Text>{' '}
              <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
            </FormLabel>
            <Box w="100%" maxW="100%">
              <ChipInput
                currentItems={nonGroupParticipants}
                placeholder="Enter email, wallet address or ENS of user"
                onChange={onParticipantsChange}
                renderItem={renderParticipantItem}
                inputProps={{
                  pr: 180,
                  errorBorderColor: 'red.500',
                }}
              />
            </Box>
            <FormHelperText mt={1}>
              <Text fontSize="12px" color="neutral.400">
                Separate participants by comma. You will be added automatically,
                no need to insert yourself
              </Text>
            </FormHelperText>
          </FormControl>
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
