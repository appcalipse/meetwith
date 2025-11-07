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
      <Box mt={8} flex="1">
        <Flex direction="column" align="center">
          <Box width="500px">
            <VStack spacing={6} align="start">
              <VStack align="start">
                <HStack justifyContent="space-between" width="100%">
                  <Heading flex={1} fontSize="2xl">
                    Invite users
                  </Heading>
                  <IconButton
                    aria-label="Close invite users"
                    icon={<CloseIcon />}
                    bg={'transparent'}
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
