import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'

import InvitedUsersCard from '@/components/group/InvitedUsersCard'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { InvitedUser } from '@/types/ParticipantInfo'
import { getAccount, inviteUsers } from '@/utils/api_helper'
import {
  isEmptyString,
  isEthereumAddressOrDomain,
  isValidEmail,
} from '@/utils/validations'

const InviteUsersPage = () => {
  const router = useRouter()
  const toast = useToast()
  const toastShown = useRef(false)

  const { success, groupName } = router.query
  const { groupId } = router.query

  const [contactIdentifier, setContactIdentifier] = useState('')
  const [message, setMessage] = useState(
    'Come join our scheduling group <Insert group name> on Meet With Wallet!'
  )
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [storedGroupId, setStoredGroupId] = useState<string>('')
  const [contactIdentifierError, setContactIdentifierError] = useState('')
  const [isFormValid, setIsFormValid] = useState(true)

  useEffect(() => {
    if (groupId && typeof groupId === 'string') {
      setStoredGroupId(groupId)
    } else {
      console.error('Invalid groupId format in query parameters', groupId)
    }
  }, [groupId])

  useEffect(() => {
    if (success && groupName && !toastShown.current) {
      toast({
        title: 'Group created successfully.',
        description: `You have created the "${groupName}" group!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
        containerStyle: {
          margin: '60px',
        },
      })
      toastShown.current = true
    }
  }, [success, groupName, toast])

  const handleSubmit = async () => {
    if (!isFormValid) {
      return
    }

    const userIdentifiers = invitedUsers.map(user => ({
      address: isEthereumAddressOrDomain(user.account_address)
        ? user.account_address
        : undefined,
      email: isValidEmail(user.account_address)
        ? user.account_address
        : undefined,
      role: 'member' as 'admin' | 'member',
    }))

    const payload = {
      invitees: userIdentifiers,
      message,
    }

    try {
      await inviteUsers(storedGroupId, payload)
      router.push('/dashboard/invite-success')
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        title: 'Error',
        description:
          'Unable to send invitations. Please check your connection and try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
        containerStyle: {
          margin: '60px',
        },
      })
      router.push('/dashboard/invite-success')
    }
  }

  const addUserToList = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()

      const input = event.currentTarget.value.trim()
      const isValidInput =
        isValidEmail(input) || isEthereumAddressOrDomain(input)

      if (!isValidInput) {
        setContactIdentifierError(
          'Please enter a valid email or Ethereum address.'
        )
        return
      }

      if (invitedUsers.some(user => user.account_address === input)) {
        setContactIdentifierError('This user has already been invited.')
        return
      }

      setContactIdentifierError('')

      if (invitedUsers.length >= 10) {
        setContactIdentifierError(
          'Invite limit reached. You can only invite up to 10 users at a time.'
        )
        return
      }

      const newUser: InvitedUser = {
        groupId: storedGroupId,
        account_address: input,
        role: 'member',
        invitePending: true,
      }
      setInvitedUsers(prev => [...prev, newUser])
      setContactIdentifier('')
    }
  }

  const removeUser = (userId: string) => {
    setInvitedUsers(prevUsers =>
      prevUsers.filter(user => user.account_address !== userId)
    )
  }

  const updateRole = (userId: string, role: InvitedUser['role']) => {
    setInvitedUsers(prevUsers =>
      prevUsers.map(user =>
        user.account_address === userId ? { ...user, role } : user
      )
    )
  }

  const handleContactIdentifierChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setContactIdentifier(e.target.value)

    if (isEmptyString(e.target.value)) {
      setContactIdentifierError('Contact identifier is required')
      setIsFormValid(false)
    } else if (
      !isValidEmail(e.target.value) &&
      !isEthereumAddressOrDomain(e.target.value)
    ) {
      setContactIdentifierError('Invalid email or EVM address')
      setIsFormValid(false)
    } else {
      setContactIdentifierError('')
      setIsFormValid(true)
    }
  }

  return (
    <Flex direction="column" mb="169px">
      <Box pt="160px" flex="1">
        <Flex direction="column" align="center">
          <Box width="500px">
            <form onSubmit={e => e.preventDefault()}>
              <VStack spacing={6} align="start">
                <Heading
                  as="h1"
                  size="xl"
                  fontWeight="700"
                  lineHeight="1.2"
                  fontFamily="'DM Sans', sans-serif"
                >
                  Invite users
                </Heading>
                <Text>
                  Enter the identifier of members you want to invite to the
                  group below (wallet address, email, etc) and they will receive
                  invitations.
                </Text>
                <FormControl isInvalid={!!contactIdentifierError}>
                  <Flex alignItems="center" gap="4px">
                    <FormLabel
                      fontSize="16px"
                      fontWeight="500"
                      lineHeight="24px"
                      fontFamily="'DM Sans', sans-serif"
                      textAlign="left"
                      style={{ display: 'inline-block' }}
                    >
                      Contact
                    </FormLabel>
                    <InfoTooltip text="Add your contacts by entering their wallet address, email or other identifier." />
                  </Flex>

                  <Input
                    id="contactIdentifier"
                    placeholder="Search or enter identifier"
                    value={contactIdentifier}
                    onChange={e => setContactIdentifier(e.target.value)}
                    onKeyDown={addUserToList}
                  />
                  {contactIdentifierError && (
                    <Text fontSize="sm" color="red.500" mt={2}>
                      {contactIdentifierError}
                    </Text>
                  )}
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Tap to enter. No need to add yourself.
                  </Text>
                </FormControl>

                {/* Placeholder for displaying added members */}
                {/* <Box> */}
                <InvitedUsersCard
                  users={invitedUsers}
                  removeUser={removeUser}
                  updateRole={updateRole}
                />

                {/* </Box> */}

                <FormControl>
                  <FormLabel
                    fontSize="16px"
                    fontWeight="500"
                    lineHeight="24px"
                    fontFamily="'DM Sans', sans-serif"
                    textAlign="left"
                  >
                    Message
                  </FormLabel>
                  <Textarea
                    id="message"
                    placeholder="Come join our scheduling group <Insert group name> on Meet With Wallet!"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    h="130px"
                  />
                </FormControl>

                <Box textAlign="right">
                  <Button
                    type="submit"
                    colorScheme="primary"
                    size="md"
                    height="48px"
                    borderRadius="8px"
                    _hover={{ bg: '#E68982' }}
                    onClick={handleSubmit}
                  >
                    Invite users
                  </Button>
                </Box>
              </VStack>
            </form>
          </Box>
        </Flex>
      </Box>
      <Box flex="0" mt="auto" />
    </Flex>
  )
}

export default InviteUsersPage
