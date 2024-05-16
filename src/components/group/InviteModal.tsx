import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  FormControl,
  FormLabel,
  Icon,
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
import { inviteUsers } from '@/utils/api_helper'

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

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const invitees = [
      {
        address: formData.get('address') as string,
        email: formData.get('email') as string,
        userId: formData.get('userId') as string,
        role: formData.get('role') as MemberType,
      },
    ]

    const payload: GroupInvitePayload = { invitees, message }

    console.log('Payload:', payload)

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

      if (invitedUsers.some(user => user.account_address === input)) {
        toast({
          title: 'User already added',
          description: 'This user has already been added to the invite list.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      const newUser: InvitedUser = {
        account_address: input,
        role: 'member',
        groupId,
        invitePending: true,
        name: '',
        guest_email: '',
      }
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
      <ModalContent width="500px">
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
                  <Icon as={InfoIcon} w={4} h={4} ml={2} />
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
                  defaultValue={`Come join our scheduling group ${groupName} on Meet With Wallet!`}
                  bg="gray.700"
                  border="1px solid"
                  borderColor="neutral.400"
                  fontSize="16px"
                  fontWeight="500"
                  color="neutral.400"
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
