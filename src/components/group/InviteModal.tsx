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

import InvitedUsersCardModal from '@/components/group/InvitedUsersCardModal'
import { GroupInvitePayload, MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import { inviteUsersToGroup } from '@/utils/api_helper'

import InfoTooltip from '../profile/components/Tooltip'

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
  const [message, setMessage] = useState<string>(
    `Come join our scheduling group ${groupName} on Meet With Wallet!`
  )

  const [isMessageFocused, setIsMessageFocused] = useState<boolean>(false)

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    console.log('Invited Users before mapping:', invitedUsers)

    const invitees = invitedUsers.map(user => ({
      address: user.account_address,
      email: user.email,
      userId: user.userId,
      role: user.role as 'admin' | 'member',
    }))

    console.log('Invitees after mapping:', invitees)

    const payload: GroupInvitePayload = { invitees }

    console.log('Payload:', payload, 'Message:', message)

    try {
      await inviteUsersToGroup(groupId, payload.invitees, message)

      toast({
        title: 'Invitation sent successfully',
        description: '',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      onClose()
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
  }

  const addUserToList = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()

      const input = event.currentTarget.value.trim()
      if (!input) return

      if (
        invitedUsers.some(
          user => user.account_address === input || user.email === input
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

      const isEmail = input.includes('@')
      const newUser: InvitedUser = {
        account_address: isEmail ? '' : input,
        email: isEmail ? input : '',
        role: 'member',
        groupId,
        userId: '',
        name: isEmail ? input.split('@')[0] : input,
        invitePending: true,
      }

      console.log('New User Added:', newUser)

      setInvitedUsers(prev => [...prev, newUser])
      event.currentTarget.value = ''
    }
  }

  const removeUser = (userAddress: string) => {
    setInvitedUsers(prevUsers =>
      prevUsers.filter(user => user.account_address !== userAddress)
    )
  }

  const updateRole = (userAddress: string, role: MemberType) => {
    setInvitedUsers(prevUsers =>
      prevUsers.map(user =>
        user.account_address === userAddress ? { ...user, role } : user
      )
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent maxWidth="500px" width="500px">
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
                  border="none"
                  onKeyDown={addUserToList}
                />
                <Text mt={2} fontSize="12px" color="gray.400">
                  Tap to enter. No need to add yourself.
                </Text>
              </FormControl>

              <InvitedUsersCardModal
                users={invitedUsers}
                removeUser={removeUser}
                updateRole={updateRole}
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
            <Button colorScheme="primary" type="submit">
              Invite
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

export default InviteModal
