import { Button, Heading, Tag, Text, VStack } from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { PaidMeetingTypes } from '@meta/Account'
import { useRouter } from 'next/router'
import React, { FC, useContext, useState } from 'react'

import { getAccountDomainUrl } from '@/utils/calendar_manager'
import { formatCurrency } from '@/utils/generic_utils'
type IProps = PaidMeetingTypes
const PaidMeetingsCard: FC<IProps> = props => {
  const { handleNavigateToBook, account } = useContext(PublicScheduleContext)
  const { push } = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSelect = async () => {
    setLoading(true)
    await push({
      pathname: `/${getAccountDomainUrl(account!)}/${props.slug}`,
    })
    // wait for the page to load before setting the selected type
    await new Promise(resolve => setTimeout(resolve, 100))
    handleNavigateToBook(props.transaction_hash)
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
      <Button colorScheme="primary" onClick={handleSelect} isLoading={loading}>
        Book session
      </Button>
    </VStack>
  )
}

export default PaidMeetingsCard
