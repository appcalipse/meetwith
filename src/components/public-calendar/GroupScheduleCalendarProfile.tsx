import { Box, Flex, Text } from '@chakra-ui/layout'
import { Jazzicon } from '@ukstv/jazzicon-react'
import Image from 'next/image'

import { Team } from '@/types/Organization'
import { getAccountDisplayName } from '@/utils/user_manager'

import { Account } from '../../types/Account'

interface GroupScheduleCalendarProfileProps {
  team?: Team
  teamAccounts?: Account[]
  title?: string
  description?: string
  loading: boolean
}
const GroupScheduleCalendarProfile: React.FC<
  GroupScheduleCalendarProfileProps
> = props => {
  return (
    <Flex direction="column" alignItems="center">
      {props.loading ? (
        <Text>Loading information...</Text>
      ) : props.team ? (
        <TeamCalendarProfile team={props.team} />
      ) : (
        <GroupCalendarProfile
          teamAccounts={props.teamAccounts!}
          title={props.title}
          description={props.description}
        />
      )}
    </Flex>
  )
}

interface GroupCalendarProfileProps {
  teamAccounts: Account[]
  title?: string
  description?: string
}

const GroupCalendarProfile: React.FC<GroupCalendarProfileProps> = props => {
  const accountsToShow = props.teamAccounts.slice(0, 3)

  const displayNames = accountsToShow
    .map(account => getAccountDisplayName(account))
    .join(', ')

  const extraText =
    accountsToShow.length !== props.teamAccounts.length
      ? ` and ${props.teamAccounts.length - accountsToShow.length} more`
      : ''

  return (
    <Flex direction="column" alignItems="center">
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
    </Flex>
  )
}

interface TeamScheduleCalendarProfileProps {
  team: Team
}

const TeamCalendarProfile: React.FC<
  TeamScheduleCalendarProfileProps
> = props => {
  return (
    <Flex direction="column" alignItems="center">
      <Box mb={4} pl={12}>
        {props.team.logo ? (
          <Box width="100px" height="100px">
            <Image src={props.team.logo!} alt={props.team.name} />
          </Box>
        ) : (
          <Box width="100px" height="100px">
            <Jazzicon address={props.team.id!} />
          </Box>
        )}
      </Box>
      <Box w="100%" textAlign="center">
        <Text fontSize="lg">{`Meet with ${props.team.name}`}</Text>
        {props.team.description && <Text mt={2}>{props.team.description}</Text>}
      </Box>
    </Flex>
  )
}

export default GroupScheduleCalendarProfile
