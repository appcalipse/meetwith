import {
  Box,
  Button,
  Flex,
  HStack,
  Tag,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { CopyLinkButton } from '@components/profile/components/CopyLinkButton'
import { MeetingType } from '@meta/Account'
import { logEvent } from '@utils/analytics'
import { durationToHumanReadable } from '@utils/calendar_manager'
import React from 'react'
import { FaClock } from 'react-icons/fa'

import { formatCurrency } from '@/utils/generic_utils'

interface CardProps extends MeetingType {
  url: string
  onSelect: (type: MeetingType) => void
}

const MeetingTypeCard: React.FC<CardProps> = ({
  title,
  url,
  duration_minutes,
  onSelect,
  ...props
}) => {
  const openType = () => {
    logEvent('Clicked to edit meeting type')
    const meetingType: MeetingType = {
      title,
      duration_minutes,
      ...props,
    }
    onSelect(meetingType)
  }

  return (
    <Box
      w={'100%'}
      flexBasis={{ base: '100%', md: '49%' }}
      mt={{ base: 4, md: 0 }}
    >
      <VStack
        borderRadius={12}
        borderColor="neutral.400"
        borderWidth={'1px'}
        p={5}
        shadow={'sm'}
        minW="280px"
        w={'100%'}
        alignItems="flex-start"
        height={'100%'}
        bgColor={useColorModeValue('white', 'neutral.900')}
      >
        <Flex width="100%" justifyContent="space-between">
          <VStack alignItems="flex-start" flex={1}>
            <Text fontWeight="medium" fontSize={20}>
              {title}
            </Text>
          </VStack>
          {props?.type && (
            <Tag
              bg="primary.400"
              variant="solid"
              px={3}
              py={2}
              h={'fit-content'}
              mr={2}
            >
              <Text fontWeight="bold">{props?.type}</Text>
            </Tag>
          )}
          <Box role={'group'} minH={10}>
            <HStack
              alignItems="center"
              bg={'neutral.800'}
              px={2}
              py={1}
              borderRadius={8}
              h={'fit-content'}
            >
              <FaClock />
              <Text>{durationToHumanReadable(duration_minutes)}</Text>
            </HStack>
          </Box>
        </Flex>
        <HStack justifyContent="space-between" w="100%">
          {props?.availabilities?.[0] && (
            <Tag colorScheme="neutral">
              Availability block: {props?.availabilities?.[0]?.title}
            </Tag>
          )}
          {props?.plan?.price_per_slot && (
            <Tag bg="green.500" fontSize="medium" color="white">
              {formatCurrency(
                props?.plan?.price_per_slot * props?.plan?.no_of_slot
              )}
              /{props?.plan?.no_of_slot} session
              {props?.plan?.no_of_slot > 1 ? 's' : ''}
            </Tag>
          )}
        </HStack>
        <HStack width="100%" pt={4} gap={5}>
          <CopyLinkButton url={url} colorScheme="neutral" px={'38px'} />
          <Button flex={1} colorScheme="primary" onClick={openType} px={'38px'}>
            Edit
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

export default MeetingTypeCard
