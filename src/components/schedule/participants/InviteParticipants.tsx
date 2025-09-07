import {
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
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
import { IGroupParticipant, isGroupParticipant } from '@/types/schedule'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { deduplicateArray } from '@/utils/generic_utils'
import { ellipsizeAddress } from '@/utils/user_manager'

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
    groupAvailability,
    groupParticipants,
  } = useParticipants()
  const groupId = useRouter().query.groupId as string | undefined
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(
    new Map()
  )
  const {
    isOpen: isContactModalOpen,
    onOpen,
    onClose: onModalClose,
  } = useDisclosure()
  const toast = useToast()
  const participantAddressesSet = useMemo(() => {
    return new Set(
      participants
        .filter((user): user is ParticipantInfo => !isGroupParticipant(user))
        .map(user => user.account_address)
        .filter(Boolean)
    )
  }, [participants])

  const isContactAlreadyAdded = useCallback(
    (account: LeanContact) => {
      return participantAddressesSet.has(account.address)
    },
    [participantAddressesSet]
  )
  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const addressesToAdd = _participants
        .map(p => p.account_address)
        .filter((a): a is string => !!a)

      React.startTransition(() => {
        setParticipants(prevUsers => {
          const groupParticipants = prevUsers.filter(user =>
            isGroupParticipant(user)
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
  const addUserFromContact = useCallback(
    async (account: LeanContact) => {
      const contactId = account.id
      setLoadingStates(prev => new Map(prev).set(contactId, true))

      if (isContactAlreadyAdded(account)) {
        toast({
          title: 'User already added',
          description: 'This user has already been added to the invite list.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
          position: 'top',
        })
        return
      }

      const newUser: ParticipantInfo = {
        type: ParticipantType.Invitee,
        account_address: account.address,
        name: account.name || '',
        status: ParticipationStatus.Pending,
        slot_id: '',
        meeting_id: '',
      }
      React.startTransition(() => {
        setParticipants(prev => [...prev, newUser])
        if (account.address) {
          setGroupParticipants(prev => ({
            ...prev,
            [NO_GROUP_KEY]: [...(prev[NO_GROUP_KEY] || []), account.address],
          }))
          setGroupAvailability(prev => ({
            ...prev,
            [NO_GROUP_KEY]: [...(prev[NO_GROUP_KEY] || []), account.address],
          }))
        }
        setLoadingStates(prev => new Map(prev).set(contactId, false))
      })
    },
    [
      isContactAlreadyAdded,
      setParticipants,
      setGroupParticipants,
      setGroupAvailability,
      toast,
    ]
  )
  const removeUserFromContact = async (account: LeanContact) => {
    const contactId = account.id
    setLoadingStates(prev => new Map(prev).set(contactId, true))

    React.startTransition(() => {
      setParticipants(prevUsers =>
        prevUsers.filter(user =>
          !isGroupParticipant(user)
            ? user.account_address !== account.address
            : true
        )
      )
      if (account.address) {
        setGroupParticipants(prev => ({
          ...prev,
          [NO_GROUP_KEY]: prev[NO_GROUP_KEY]?.filter(
            address => address !== account.address
          ),
        }))

        setGroupAvailability(prev => ({
          ...prev,
          [NO_GROUP_KEY]: prev[NO_GROUP_KEY]?.filter(
            address => address !== account.address
          ),
        }))
      }
      setLoadingStates(prev => new Map(prev).set(contactId, false))
    })
  }
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
    () => participants.filter(participant => !isGroupParticipant(participant)),
    [participants]
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay bg="#131A20CC" backdropFilter={'blur(25px)'} />
      <ModalContent
        maxWidth="500px"
        width="500px"
        border={1}
        borderColor="neutral.600"
        bg="neutral.900"
        py={6}
      >
        <ModalHeader fontSize="24px" py={0}>
          Invite Participants
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <GroupContactModal
            addUserFromContact={addUserFromContact}
            isOpen={isContactModalOpen}
            onClose={onModalClose}
            isContactAlreadyAdded={isContactAlreadyAdded}
            removeUserFromContact={removeUserFromContact}
            buttonLabel="Add to Meeting"
            title="Add from Contact List"
            loadingStates={loadingStates}
          />
          {isGroupPrefetching ? (
            <Loading />
          ) : groups.length > 0 ? (
            <AddFromGroups />
          ) : (
            <Text>No groups available. Please create a group first.</Text>
          )}
          <Divider my={6} borderColor="neutral.400" />

          <FormControl>
            <FormLabel display="flex" alignItems="center">
              Add from Contact list
            </FormLabel>
            <HStack
              onClick={onOpen}
              borderColor="neutral.400"
              borderWidth={1}
              cursor="pointer"
              color="neutral.400"
              justifyContent="space-between"
              borderRadius="0.375rem"
              height={10}
              fontSize="16"
              px={4}
            >
              <Text userSelect="none">Select member</Text>
              <Icon as={FaChevronDown} w={4} h={4} />
            </HStack>
            <FormHelperText fontSize="12px" color="neutral.400">
              Select members from your contact list
            </FormHelperText>
          </FormControl>
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
                placeholder="Enter participants"
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
