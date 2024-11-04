import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Text,
  VStack,
} from '@chakra-ui/react'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

const InviteSuccessPage: NextPage<{ invitedCount: number }> = ({
  invitedCount,
}) => {
  const router = useRouter()

  return (
    <Flex direction="column" align="center" minH="100vh" mt={36}>
      <VStack maxW="400px" w="full">
        <Box display="flex" justifyContent="center" width="full" mb="32px">
          <Image
            src="/assets/create-group-success.svg"
            alt="Success"
            width="350px"
            alignSelf="center"
            m="0"
            p="0"
          />
        </Box>
        <Heading
          as="h1"
          fontWeight="700"
          textAlign="center"
          mb="8px"
          fontSize="24px"
          lineHeight="28.8px"
          fontFamily="'DM Sans', sans-serif"
          display="flex"
          justifyContent="center"
        >
          Success!
        </Heading>
        <Text
          textAlign="center"
          width="349px"
          mb="30px"
          fontWeight="500"
          fontSize="16px"
          lineHeight="24px"
          fontFamily="'DM Sans', sans-serif"
        >
          <strong>
            {invitedCount} user{invitedCount > 1 && 's'}
          </strong>{' '}
          will receive invitations to join your new Group. You can manage their
          permissions and send them reminders.
        </Text>
        <Button
          onClick={() => router.push('/dashboard/groups')}
          colorScheme="primary"
          size="md"
          height="48px"
          borderRadius="8px"
          w="full"
          mb="8px"
        >
          View Groups
        </Button>
        <Button
          onClick={() => router.push('/dashboard/create-group')}
          variant="outline"
          colorScheme="primary"
          size="md"
          height="48px"
          borderRadius="8px"
          borderWidth="2px"
          w="full"
        >
          Create another Group
        </Button>
      </VStack>
    </Flex>
  )
}
InviteSuccessPage.getInitialProps = async ctx => {
  const { invitedCount } = ctx.query
  return { invitedCount: Number(invitedCount) }
}
export default InviteSuccessPage
