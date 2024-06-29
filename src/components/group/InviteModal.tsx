import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react'
import React, { FC, FormEvent, useState } from 'react'

import { GroupInvitePayload, MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import {
  getExistingAccounts,
  getExistingAccountsSimple,
  inviteUsers,
} from '@/utils/api_helper'
import { isValidEmail, isValidEVMAddress } from '@/utils/validations'

import InfoTooltip from '../profile/components/Tooltip'
import InvitedUsersList from './InvitedUsersList'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
  onInviteSuccess?: () => void
}

const InviteModal: FC<InviteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onInviteSuccess,
}) => {
  const toast = useToast()
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [enteredIdentifier, setEnteredIdentifier] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [message, setMessage] = useState<string>(
    `Come join our scheduling group ${groupName} on Meet With Wallet!`
  )

  const [isMessageFocused, setIsMessageFocused] = useState<boolean>(false)

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    console.log('Invited Users before mapping:', invitedUsers)

    const invitees = invitedUsers.map(user => ({
      address: user.account_address?.toLowerCase(),
      email: user.email?.toLowerCase(),
      userId: user.userId?.toLowerCase(),
      role: user.role,
    }))

    console.log('Invitees after mapping:', invitees)

    const payload: GroupInvitePayload = { invitees, message }

    console.log('Payload:', payload, 'Message:', message)

    try {
      await inviteUsers(groupId, payload)

      toast({
        title: 'Invitation sent successfully',
        description: '',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      onClose()
      setInvitedUsers([])
      onInviteSuccess?.()
    } catch (error) {
      const err = error as Error
      toast({
        title: 'Error inviting member',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
    setIsSaving(false)
  }

  const addUserToList = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      setIsLoading(true)
      event.preventDefault()
      if (!enteredIdentifier) return

      if (
        invitedUsers.some(
          user =>
            user.account_address === enteredIdentifier ||
            user.email === enteredIdentifier
        )
      ) {
        toast({
          title: 'User already added',
          description: 'This user has already been added to the invite list.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      const isEmail = isValidEmail(enteredIdentifier)
      const newUser: InvitedUser = {
        id: invitedUsers.length,
        account_address: !isEmail ? enteredIdentifier : '',
        email: isEmail ? enteredIdentifier : '',
        role: MemberType.MEMBER,
        groupId,
        userId: '',
        name: enteredIdentifier,
        invitePending: true,
      }
      if (isValidEVMAddress(enteredIdentifier)) {
        const info = await getExistingAccounts([enteredIdentifier])
        const userDetails = info[0]
        if (userDetails) {
          newUser.userId = userDetails.preferences.id
          newUser.name = userDetails.preferences.name
        }
      }
      setInvitedUsers(prev => [...prev, newUser])
      setEnteredIdentifier('')
      setIsLoading(false)
    }
  }

  const removeUser = (inviteeId: number) => {
    setInvitedUsers(prevUsers =>
      prevUsers.filter(user => user.id !== inviteeId)
    )
  }

  const updateRole = (inviteeId: number, role: MemberType) => {
    setInvitedUsers(prevUsers =>
      prevUsers.map(user => (user.id === inviteeId ? { ...user, role } : user))
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent
        maxWidth="500px"
        width="500px"
        border={1}
        borderColor="neutral.600"
      >
        <ModalHeader pt={6} fontSize="24px">
          Invite Group Members
        </ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleInviteSubmit}>
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel display="flex" alignItems="center">
                  Contact
                  <InfoTooltip text="Add your contacts by entering their wallet address, email or other identifier." />
                </FormLabel>
                <Input
                  name="identifier"
                  placeholder="Search or enter identifier"
                  bg="neutral.900"
                  _placeholder={{
                    color: 'neutral.400',
                  }}
                  border="none"
                  disabled={isLoading}
                  value={enteredIdentifier}
                  onChange={e => setEnteredIdentifier(e.target.value)}
                  onKeyDown={addUserToList}
                />
                <Text mt={2} fontSize="12px" color="gray.400">
                  Tap to enter. No need to add yourself.
                </Text>
              </FormControl>

              <InvitedUsersList
                users={invitedUsers}
                removeUser={removeUser}
                updateRole={updateRole}
                isLoading={isLoading}
              />

              <FormControl>
                <FormLabel>Message</FormLabel>
                <Textarea
                  name="message"
                  defaultValue={`Come join our scheduling group "${groupName}" on Meet With Wallet!`}
                  bg="gray.700"
                  border="1px solid"
                  borderColor="neutral.400"
                  fontSize="16px"
                  fontWeight="500"
                  color={isMessageFocused ? 'white' : 'neutral.400'}
                  onFocus={() => setIsMessageFocused(true)}
                  onBlur={() => setIsMessageFocused(false)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter pb={6}>
            <Button
              colorScheme="primary"
              type="submit"
              isLoading={isSaving}
              disabled={invitedUsers.length < 1}
            >
              Invite
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

export default InviteModal
