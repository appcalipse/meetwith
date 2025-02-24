import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'

import GroupInviteForm from '@/components/group/GroupInviteForm'

const InviteUsersPage = () => {
  const router = useRouter()
  const { groupName, groupId } = router.query
  return (
    <Flex direction="column" mb="169px">
      <Box mt={36} flex="1">
        <Flex direction="column" align="center">
          <Box width="500px">
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
                Enter the identifier of members you want to invite to the group
                below (wallet address, email, etc) and they will receive
                invitations.
              </Text>
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
