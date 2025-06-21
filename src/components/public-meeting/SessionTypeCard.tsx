import { Button, Heading, Tag, Text, VStack } from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { MeetingType } from '@meta/Account'
import { PublicSchedulingSteps } from '@utils/constants/meeting-types'
import React, { FC, useContext } from 'react'

import { formatCurrency } from '@/utils/generic_utils'
type IProps = MeetingType
const SessionTypeCard: FC<IProps> = props => {
  const { handleSetSelectedType } = useContext(PublicScheduleContext)
  const handleSelect = async () => {
    await handleSetSelectedType(props, PublicSchedulingSteps.PAY_FOR_SESSION)
  }
  return (
    <VStack
      bg={'neutral.825'}
      flexBasis={{ base: '100%', md: '49%' }}
      alignItems={'flex-start'}
      p={6}
      rounded={'lg'}
      gap={4}
    >
      <VStack gap={2} alignItems={'flex-start'} w={'100%'}>
        <Heading fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}>
          {props.title}
        </Heading>
        <Text>{props?.duration_minutes} mins per session</Text>
      </VStack>
      {props?.plan?.price_per_slot && (
        <Tag
          bg="green.500"
          px={2}
          color="black"
          rounded={'full'}
          fontSize={'sm'}
        >
          {formatCurrency(
            props?.plan?.price_per_slot * props?.plan?.no_of_slot
          )}
          /{props?.plan?.no_of_slot} session
          {props?.plan?.no_of_slot > 1 ? 's' : ''}
        </Tag>
      )}
      <Button colorScheme="primary" onClick={handleSelect}>
        Book session
      </Button>
    </VStack>
  )
}

export default SessionTypeCard
