import { Box, HStack, Text } from '@chakra-ui/layout'
import { Button, Flex, Heading, VStack } from '@chakra-ui/react'
import { Avatar } from '@components/profile/components/Avatar'
import { PublicScheduleContext } from '@components/public-meeting/index'
import SessionTypeCard from '@components/public-meeting/SessionTypeCard'
import { getAccountDisplayName } from '@utils/user_manager'
import React, { FC, useContext } from 'react'

import useAccountContext from '@/hooks/useAccountContext'

import PaidMeetings from './PaidMeetings'

const BasePage: FC = () => {
  const { account } = useContext(PublicScheduleContext)
  const currentAccount = useAccountContext()
  const [paidSessionsExists, setPaidSessionsExists] = React.useState(false)

  return (
    <VStack
      gap={{ md: 8, base: 6 }}
      w={{ base: '100%', md: '80%', lg: '60%' }}
      alignItems={{ md: 'flex-start', base: 'center' }}
      marginX={'auto'}
      px={'4'}
    >
      <Flex
        w={'100%'}
        alignItems={{ base: 'flex-start', md: 'flex-end' }}
        justifyContent="space-between"
        flexDirection={{
          base: 'column',
          md: 'row',
        }}
        gap={4}
      >
        <Box
          borderWidth="1px"
          borderColor="neutral.800"
          borderRadius="md"
          p={4}
          w="max-content"
          minW={{ base: '100%', md: '40%' }}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <HStack gap={{ md: 4, base: 2 }} alignItems="center">
            <Box w={10} h={10}>
              <Avatar account={account} />
            </Box>
            <Text fontSize={{ md: 'lg', base: 'medium' }} fontWeight="500">
              {getAccountDisplayName(account)}
            </Text>
          </HStack>
          {account.preferences?.description && (
            <Text fontWeight="700">{account.preferences.description}</Text>
          )}
        </Box>
        <Text fontWeight={500}>
          Login to see all plans that you have paid for.{' '}
          <Button
            variant="link"
            colorScheme="primary"
            color="primary.400"
            textDecoration="underline"
            fontWeight={600}
          >
            Sign in
          </Button>
        </Text>
      </Flex>
      <VStack gap={4} w={'100%'} alignItems="flex-start">
        {currentAccount?.address && (
          <PaidMeetings setPaidSessionsExists={setPaidSessionsExists} />
        )}
        <VStack gap={4} w={'100%'} alignItems="flex-start">
          {paidSessionsExists && (
            <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
              All Plans
            </Heading>
          )}
          <HStack
            w={'100%'}
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            rowGap={{ base: 4, md: '1vw' }}
          >
            {account?.meetingTypes?.map(val => (
              <SessionTypeCard key={val.id} {...val} />
            ))}
          </HStack>
        </VStack>
      </VStack>
    </VStack>
  )
}

export default BasePage
