import { Box, Flex, HStack, Text } from '@chakra-ui/layout'
import { Jazzicon } from '@ukstv/jazzicon-react'

import { getAccountDisplayName } from '@/utils/user_manager'

import { Account } from '../../types/Account'

interface GroupScheduleCalendarProfileProps {
  teamAccounts: Account[]
  title?: string
  description?: string
}
const GroupScheduleCalendarProfile: React.FC<
  GroupScheduleCalendarProfileProps
> = props => {
  const accountsToShow = props.teamAccounts.slice(0, 3)

  const displayNames = accountsToShow
    .map(account => getAccountDisplayName(account))
    .join(', ')

  const extraText =
    accountsToShow.length !== props.teamAccounts.length
      ? `and ${props.teamAccounts.length - accountsToShow.length} more`
      : ''

  return (
    <Flex direction="column" alignItems="center">
      {props.teamAccounts.length === 0 ? (
        <Text>Loading information...</Text>
      ) : (
        <>
          <HStack mb={4}>
            {props.teamAccounts.map((account, index) => (
              <Box key={index} width="100px" height="100px" mr={-12}>
                <Jazzicon address={account.address} />
              </Box>
            ))}
          </HStack>
          <Box w="100%" textAlign="center">
            <Text fontSize="lg">{`Meet with ${displayNames}${extraText}`}</Text>
          </Box>
        </>
      )}
    </Flex>
  )
}

export default GroupScheduleCalendarProfile
