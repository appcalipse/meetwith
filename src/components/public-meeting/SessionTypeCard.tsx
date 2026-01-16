import {
  Button,
  Heading,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { MeetingType } from '@meta/Account'
import { PublicSchedulingSteps } from '@utils/constants/meeting-types'
import React, { FC, useContext, useState } from 'react'

import { formatCurrency } from '@/utils/generic_utils'

type IProps = MeetingType
const SessionTypeCard: FC<IProps> = props => {
  const { handleSetSelectedType } = useContext(PublicScheduleContext)
  const [loading, setLoading] = useState(false)
  const bgColor = useColorModeValue('white', 'neutral.825')
  const borderColor = useColorModeValue('neutral.200', 'neutral.825')
  const handleSelect = async () => {
    setLoading(true)
    await handleSetSelectedType(props, PublicSchedulingSteps.BOOK_SESSION)
    setLoading(false)
  }
  return (
    <VStack
      border={'1px solid'}
      borderColor={borderColor}
      bg={bgColor}
      flexBasis={{ base: '100%', md: '49%' }}
      alignItems={'flex-start'}
      p={6}
      rounded={'lg'}
      gap={4}
    >
      <VStack gap={2} alignItems={'flex-start'} w={'100%'}>
        <Tooltip label={props.title}>
          <Heading
            fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}
            maxW={{ '2xl': '400px', lg: 270, xl: 300, base: 200 }}
            w="fit-content"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            cursor={'pointer'}
          >
            {props.title}
          </Heading>
        </Tooltip>
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
