import { Box, Flex, HStack, Text } from '@chakra-ui/layout'
import { Jazzicon } from '@ukstv/jazzicon-react'

import { getAccountDisplayName } from '@/utils/user_manager'

import { Account } from '../../types/Account'

interface TeamScheduleCalendarProfileProps {
  accounts: Account[]
  title?: string
  description?: string
}
const TeamScheduleCalendarProfile: React.FC<
  TeamScheduleCalendarProfileProps
> = props => {
  const accountsToShow = props.accounts.slice(0, 3)

  const displayNames = accountsToShow
    .map(account => getAccountDisplayName(account))
    .join(', ')

  const extraText =
    accountsToShow.length !== props.accounts.length
      ? `and ${props.accounts.length - accountsToShow.length} more`
      : ''

  return (
    <Flex direction="column" alignItems="center">
      {props.accounts.length === 0 ? (
        <Text>Loading information...</Text>
      ) : (
        <>
          <HStack mb={4}>
            {props.accounts.map((account, index) => (
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

export default TeamScheduleCalendarProfile
