import { CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react'
import { EditMode } from '@meta/Dashboard'
import { useRouter } from 'next/router'
import React from 'react'
import { FaArrowLeft } from 'react-icons/fa'

import GroupInviteForm from '@/components/group/GroupInviteForm'

const InviteUsersPage = () => {
  const router = useRouter()
  const { groupName, groupId } = router.query
  return (
    <Flex direction="column" mb="169px">
      <Box flex="1" mt={8}>
        <Flex align="center" direction="column">
          <Box width="500px">
            <VStack align="start" spacing={6}>
              <VStack align="start">
                <HStack justifyContent="space-between" width="100%">
                  <Heading flex={1} fontSize="2xl">
                    Invite users
                  </Heading>
                  <IconButton
                    aria-label="Close invite users"
                    bg={'transparent'}
                    icon={<CloseIcon />}
                    onClick={() => router.push(`/dashboard/${EditMode.GROUPS}`)}
                  />
                </HStack>
                <Text>
                  Enter the identifier of members you want to invite to the
                  group below (wallet address, email, etc) and they will receive
                  invitations.
                </Text>
              </VStack>
              <GroupInviteForm
                groupId={
                  Array.isArray(groupId) ? groupId[0] : (groupId as string)
                }
                groupName={
                  Array.isArray(groupName)
                    ? groupName[0]
                    : (groupName as string)
                }
                onClose={true}
              />
            </VStack>
          </Box>
        </Flex>
      </Box>
    </Flex>
  )
}

export default InviteUsersPage
