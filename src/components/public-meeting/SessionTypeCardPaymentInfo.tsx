import { Box, HStack } from '@chakra-ui/layout'
import { Button, Heading, Tag, Text, VStack } from '@chakra-ui/react'
import { Avatar } from '@components/profile/components/Avatar'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { MeetingType } from '@meta/Account'
import { getAccountDisplayName } from '@utils/user_manager'
import React, { FC, useContext } from 'react'

import { formatCurrency } from '@/utils/generic_utils'
const SessionTypeCardPaymentInfo = () => {
  const { selectedType, account } = useContext(PublicScheduleContext)
  return (
    <VStack
      bg={'neutral.825'}
      flexBasis={'100%'}
      width={'100%'}
      alignItems={'flex-start'}
      p={6}
      rounded={'lg'}
      gap={6}
    >
      <HStack w={'100%'} justifyContent="space-between" alignItems="center">
        <HStack gap={{ md: 4, base: 2 }} alignItems="center">
          <Box w={10} h={10}>
            <Avatar account={account} />
          </Box>
          <Text fontSize={{ md: 'lg', base: 'medium' }} fontWeight="500">
            {getAccountDisplayName(account)}
          </Text>
        </HStack>
        <Tag
          bg="green.500"
          px={2}
          color="black"
          rounded={'full'}
          fontSize={'sm'}
        >
          {!!selectedType?.plan ? (
            <>
              {formatCurrency(
                selectedType?.plan?.price_per_slot *
                  selectedType?.plan?.no_of_slot
              )}
              /{selectedType?.plan?.no_of_slot} session
              {selectedType?.plan?.no_of_slot > 1 ? 's' : ''})
            </>
          ) : (
            'Free'
          )}
        </Tag>
      </HStack>
      <VStack gap={4} alignItems={'flex-start'} w={'100%'}>
        <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
          {selectedType?.title}
        </Heading>
        <Text>{selectedType?.duration_minutes} mins per session</Text>
      </VStack>
    </VStack>
  )
}

export default SessionTypeCardPaymentInfo
