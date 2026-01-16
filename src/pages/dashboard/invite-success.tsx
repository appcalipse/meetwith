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
    <Flex align="center" direction="column" minH="100vh" mt={8}>
      <VStack maxW="400px" w="full">
        <Box display="flex" justifyContent="center" mb="32px" width="full">
          <Image
            alignSelf="center"
            alt="Success"
            m="0"
            p="0"
            src="/assets/create-group-success.svg"
            width="350px"
          />
        </Box>
        <Heading
          as="h1"
          display="flex"
          fontFamily="'DM Sans', sans-serif"
          fontSize="24px"
          fontWeight="700"
          justifyContent="center"
          lineHeight="28.8px"
          mb="8px"
          textAlign="center"
        >
          Success!
        </Heading>
        <Text
          fontFamily="'DM Sans', sans-serif"
          fontSize="16px"
          fontWeight="500"
          lineHeight="24px"
          mb="30px"
          textAlign="center"
          width="349px"
        >
          <strong>
            {invitedCount} user{invitedCount > 1 && 's'}
          </strong>{' '}
          will receive invitations to join your new Group. You can manage their
          permissions and send them reminders.
        </Text>
        <Button
          borderRadius="8px"
          colorScheme="primary"
          height="48px"
          mb="8px"
          onClick={() => router.push('/dashboard/groups')}
          size="md"
          w="full"
        >
          View Groups
        </Button>
        <Button
          borderRadius="8px"
          borderWidth="2px"
          colorScheme="primary"
          height="48px"
          onClick={() => router.push('/dashboard/create-group')}
          size="md"
          variant="outline"
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
