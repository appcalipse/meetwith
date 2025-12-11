import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { FC, FormEvent, useEffect, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'

import InvitedUsersList from '@/components/group/InvitedUsersList'
import { LeanContact } from '@/types/Contacts'
import { GroupInvitePayload, MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import { getExistingAccounts, inviteUsers } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { ContactNotFound } from '@/utils/errors'
import {
  isEthereumAddressOrDomain,
  isValidEmail,
  isValidEVMAddress,
} from '@/utils/validations'

import GroupContactModal from '../contact/GroupContactModal'
import PublicGroupLink from './PublicGroupLink'

interface InviteModalProps {
  onClose: (() => void) | boolean
  groupId: string
  groupName: string
  onInviteSuccess?: () => void
}

const GroupInviteForm: FC<InviteModalProps> = ({
  groupName,
  onInviteSuccess,
  groupId,
  onClose,
}) => {
  const toast = useToast()
  const { isOpen, onOpen, onClose: onModalClose } = useDisclosure()
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [enteredIdentifier, setEnteredIdentifier] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const router = useRouter()
  const blurredColor = useColorModeValue('neutral.400', 'neutral.400')
  const focusedColor = useColorModeValue('neutral.800', 'white')
  const [message, setMessage] = useState<string>(
    `Come join our scheduling group "${groupName}" on Meetwith!`
  )
  useEffect(() => {
    setMessage(`Come join our scheduling group "${groupName}" on Meetwith!`)
  }, [groupName])
  const [isMessageFocused, setIsMessageFocused] = useState<boolean>(false)

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    const invitees: GroupInvitePayload['invitees'] = invitedUsers.map(user => ({
      address: user.account_address?.toLowerCase(),
      email: user.email?.toLowerCase(),
      userId: user.userId?.toLowerCase(),
      role: user.role,
      name: user.name,
      contactId: user?.contactId,
    }))

    const payload: GroupInvitePayload = { invitees, message }
    try {
      await inviteUsers(groupId, payload)

      toast({
        title: 'Invitation sent successfully',
        description: '',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
      if (typeof onClose === 'boolean') {
        router.push({
          pathname: `/dashboard/invite-success`,
          query: {
            invitedCount: invitedUsers.length,
          },
        })
      } else {
        onClose()
      }
      setInvitedUsers([])
      onInviteSuccess?.()
    } catch (error: unknown) {
      if (error instanceof ContactNotFound) {
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
      handleApiError('Error inviting member', error)
    }
    setIsSaving(false)
  }

  const addUserToList = async (
    event:
      | React.KeyboardEvent<HTMLInputElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    const sanitizedIdentifier = sanitizedIdentifier
    if (!sanitizedIdentifier) return
    setIsLoading(true)
    const isValidInput =
      isValidEmail(sanitizedIdentifier) ||
      isEthereumAddressOrDomain(sanitizedIdentifier)

    if (!isValidInput) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid email or Ethereum address.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      })
      setIsLoading(false)
      return
    }
    if (
      invitedUsers.some(
        user =>
          user.account_address === sanitizedIdentifier ||
          user.email === sanitizedIdentifier
      )
    ) {
      toast({
        title: 'User already added',
        description: 'This user has already been added to the invite list.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      })
      setIsLoading(false)
      return
    }

    const isEmail = isValidEmail(sanitizedIdentifier)
    const newUser: InvitedUser = {
      id: invitedUsers.length,
      account_address: !isEmail ? sanitizedIdentifier : '',
      email: isEmail ? sanitizedIdentifier : '',
      role: MemberType.ADMIN,
      groupId,
      userId: '',
      name: enteredIdentifier,
      invitePending: true,
    }
    if (isValidEVMAddress(sanitizedIdentifier)) {
      const info = await getExistingAccounts([sanitizedIdentifier])
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
  const addUserFromContact = (account: LeanContact) => {
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

    const newUser: InvitedUser = {
      id: invitedUsers.length,
      account_address: account.address || '',
      role: MemberType.ADMIN,
      groupId,
      name: account.name,
      invitePending: true,
      contactId: account.id,
    }
    setInvitedUsers(prev => [...prev, newUser])
  }
  const removeUserFromContact = (account: LeanContact) => {
    setInvitedUsers(prevUsers =>
      prevUsers.filter(user => user.account_address !== account.address)
    )
  }

  const isContactAlreadyAdded = (account: LeanContact) => {
    return invitedUsers.some(user => user.account_address === account.address)
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
    <form style={{ width: '100%' }} onSubmit={handleInviteSubmit}>
      <Box pb={6}>
        <GroupContactModal
          addUserFromContact={addUserFromContact}
          isOpen={isOpen}
          onClose={onModalClose}
          isContactAlreadyAdded={isContactAlreadyAdded}
          removeUserFromContact={removeUserFromContact}
        />
        <VStack spacing={6} align="stretch">
          <PublicGroupLink groupId={groupId} />
          <FormControl>
            <FormLabel display="flex" alignItems="center">
              Send email invite to User ID(s)
            </FormLabel>
            <HStack>
              <Input
                name="identifier"
                placeholder="Search or enter identifier"
                _placeholder={{
                  color: 'neutral.400',
                }}
                borderColor="neutral.400"
                disabled={isLoading}
                value={enteredIdentifier}
                onChange={e => setEnteredIdentifier(e.target.value.trim())}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addUserToList(e)
                  }
                }}
              />
              <Button
                colorScheme="primary"
                type="button"
                isLoading={isLoading}
                isDisabled={isLoading}
                onClick={e => addUserToList(e)}
              >
                <CheckIcon />
              </Button>
            </HStack>
            <Text mt={2} fontSize="12px" color="gray.400">
              Press enter. No need to add yourself.
            </Text>
          </FormControl>
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
              value={message}
              onChange={e => setMessage(e.target.value)}
              border="1px solid"
              borderColor="neutral.400"
              fontSize="16px"
              fontWeight="500"
              color={isMessageFocused ? focusedColor : blurredColor}
              onFocus={() => setIsMessageFocused(true)}
              onBlur={() => setIsMessageFocused(false)}
            />
          </FormControl>
        </VStack>
      </Box>
      <Box pb={6}>
        <Button
          colorScheme="primary"
          type="submit"
          isLoading={isSaving}
          isDisabled={invitedUsers.length < 1}
        >
          Invite users
        </Button>
      </Box>
    </form>
  )
}

export default GroupInviteForm
