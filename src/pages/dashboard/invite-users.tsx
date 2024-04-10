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
import React, { useEffect, useState } from 'react'

import InvitedUsersCard from '@/components/group/InvitedUsersCard'
import InfoTooltip from '@/components/profile/components/Tooltip'
import { InvitedUser } from '@/types/ParticipantInfo'

const InviteUsersPage = () => {
  const router = useRouter()
  const toast = useToast()
  const { success, groupName } = router.query

  const [contactIdentifier, setContactIdentifier] = useState('')
  const [message, setMessage] = useState(
    'Come join our scheduling group <Insert group name> on Meet With Wallet!'
  )
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])

  const { groupId } = router.query
  const [storedGroupId, setStoredGroupId] = useState<string>('') // Initialize with empty string

  useEffect(() => {
    if (groupId && typeof groupId === 'string') {
      setStoredGroupId(groupId)
    } else {
      console.error('Invalid groupId format in query parameters', groupId)
      // Optionally redirect to an error page or display a message
    }
  }, [groupId])

  useEffect(() => {
    if (success && groupName) {
      toast({
        title: 'Group created successfully.',
        description: `You have created the "${groupName}" group!`,
        status: 'success',
        duration: 9000,
        isClosable: true,
        position: 'top',
      })
    }
  }, [success, groupName, toast])

  const sendInvites = async () => {
    try {
      const response = await fetch('/api/invite-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitedUsers, message }),
      })

      if (response.ok) {
        toast({
          title: 'Invitations sent successfully.',
          description: 'Your invitations have been dispatched.',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
        setInvitedUsers([]) // Clear the list after sending
      } else {
        // Handle errors
        toast({
          title: 'Failed to send invitations.',
          description: 'Something went wrong. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        title: 'Error',
        description:
          'Unable to send invitations. Please check your connection and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
  }

  const addUserToList = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (invitedUsers.length < 10) {
        const newUser: InvitedUser = {
          groupId: storedGroupId,
          account_address: contactIdentifier,
          role: 'member',
          invitePending: true,
        }
        console.log('New user:', newUser)
        setInvitedUsers(prev => [...prev, newUser])
        console.log('New added users:', invitedUsers)
        setContactIdentifier('')
      } else {
        toast({
          title: 'Invite Limit Reached',
          description: 'You can only invite up to 10 users at a time.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
          position: 'top',
        })
      }
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

  return (
    <Flex direction="column" mb="169px">
      <Box pt="160px" flex="1">
        <Flex direction="column" align="center">
          <Box width="500px">
            <form onSubmit={sendInvites}>
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
                <FormControl>
                  <Flex
                    alignItems="center"
                    // justifyContent="space-between"
                    gap="4px"
                  >
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
                    onChange={e => {
                      setContactIdentifier(e.target.value)
                      console.log('Contact identifier:', e.target.value)
                    }}
                    onKeyPress={addUserToList}
                  />
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
                    onClick={sendInvites}
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
