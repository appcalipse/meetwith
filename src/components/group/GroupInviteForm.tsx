import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { FC, FormEvent, useEffect, useState } from 'react'

import InvitedUsersList from '@/components/group/InvitedUsersList'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { GroupInvitePayload, MemberType } from '@/types/Group'
import { InvitedUser } from '@/types/ParticipantInfo'
import { getExistingAccounts, inviteUsers } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import {
  isEthereumAddressOrDomain,
  isValidEmail,
  isValidEVMAddress,
} from '@/utils/validations'

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
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [enteredIdentifier, setEnteredIdentifier] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const router = useRouter()
  const [message, setMessage] = useState<string>(
    `Come join our scheduling group "${groupName}" on Meet With Wallet!`
  )
  useEffect(() => {
    setMessage(
      `Come join our scheduling group "${groupName}" on Meet With Wallet!`
    )
  }, [groupName])
  const [isMessageFocused, setIsMessageFocused] = useState<boolean>(false)

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    const invitees = invitedUsers.map(user => ({
      address: user.account_address?.toLowerCase(),
      email: user.email?.toLowerCase(),
      userId: user.userId?.toLowerCase(),
      role: user.role,
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
    } catch (error: any) {
      handleApiError('Error inviting member', error)
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
      const isValidInput =
        isValidEmail(enteredIdentifier) ||
        isEthereumAddressOrDomain(enteredIdentifier)

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
          position: 'top',
        })
        setIsLoading(false)
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
    <form style={{ width: '100%' }} onSubmit={handleInviteSubmit}>
      <Box pb={6}>
        <VStack spacing={6} align="stretch">
          <FormControl>
            <FormLabel display="flex" alignItems="center">
              Contact
              <InfoTooltip text="Add your contacts by entering their wallet address, email or other identifier." />
            </FormLabel>
            <Input
              name="identifier"
              placeholder="Search or enter identifier"
              _placeholder={{
                color: 'neutral.400',
              }}
              borderColor="neutral.400"
              disabled={isLoading}
              value={enteredIdentifier}
              onChange={e => setEnteredIdentifier(e.target.value)}
              onKeyDown={addUserToList}
            />
            <Text mt={2} fontSize="12px" color="gray.400">
              Press enter. No need to add yourself.
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
              value={message}
              onChange={e => setMessage(e.target.value)}
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
