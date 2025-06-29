import { Button, Heading, Tag, Text, VStack } from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { MeetingType } from '@meta/Account'
import { PublicSchedulingSteps } from '@utils/constants/meeting-types'
import React, { FC, useContext, useState } from 'react'

import { formatCurrency } from '@/utils/generic_utils'
type IProps = MeetingType
const SessionTypeCard: FC<IProps> = props => {
  const { handleSetSelectedType } = useContext(PublicScheduleContext)
  const [loading, setLoading] = useState(false)
  const handleSelect = async () => {
    setLoading(true)
    await handleSetSelectedType(
      props,
      props?.plan
        ? PublicSchedulingSteps.PAY_FOR_SESSION
        : PublicSchedulingSteps.BOOK_SESSION
    )
    setLoading(false)
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
      <Tag bg="green.500" px={2} color="black" rounded={'full'} fontSize={'sm'}>
        {!!props?.plan ? (
          <>
            {formatCurrency(
              props?.plan?.price_per_slot * props?.plan?.no_of_slot
            )}
            /{props?.plan?.no_of_slot} session
            {props?.plan?.no_of_slot > 1 ? 's' : ''}
          </>
        ) : (
          'Free'
        )}
      </Tag>
      <Button colorScheme="primary" onClick={handleSelect} isLoading={loading}>
        Book session
      </Button>
    </VStack>
  )
}

export default SessionTypeCard
