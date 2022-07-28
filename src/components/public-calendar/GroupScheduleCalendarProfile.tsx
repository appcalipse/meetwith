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
          <Box mb={4} pl={12}>
            {props.teamAccounts.map((account, index) => (
              <Box
                key={index}
                width="100px"
                height="100px"
                ml={-12}
                display="inline-block"
              >
                <Jazzicon address={account.address} />
              </Box>
            ))}
          </Box>
          <Box w="100%" textAlign="center">
            <Text fontSize="lg">{`Meet with ${displayNames}${extraText}`}</Text>
          </Box>
        </>
      )}
    </Flex>
  )
}

export default GroupScheduleCalendarProfile
