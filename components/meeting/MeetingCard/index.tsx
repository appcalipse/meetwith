import { Badge, Box } from '@chakra-ui/layout'
import dayjs from '../../../utils/dayjs_entender'
import { DBSlot } from '../../../types/Meeting'

interface MeetingCardProps {
  meeting: DBSlot
  opened?: boolean
}
const MeetingCard = ({ meeting, opened = false }: MeetingCardProps) => {
  const duration = dayjs(meeting.end).diff(dayjs(meeting.start), 'minute')

  return (
    <Box
      boxShadow="base"
      maxW="lg"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
    >
      <Box p="6">
        <Box display="flex" alignItems="baseline">
          <Badge borderRadius="full" px="2" colorScheme="teal">
            Upcoming
          </Badge>
          <Box
            color="gray.500"
            fontWeight="semibold"
            letterSpacing="wide"
            fontSize="xs"
            textTransform="uppercase"
            ml="2"
          >
            Source: {meeting.id}
          </Box>
        </Box>

        <Box
          mt="1"
          fontWeight="semibold"
          as="h4"
          lineHeight="tight"
          isTruncated
        >
          Target: {meeting.account_pub_key}
        </Box>

        <Box>{dayjs(meeting.start).format('LLLL')}</Box>

        <Box>{duration}</Box>
      </Box>
    </Box>
  )
}

export default MeetingCard
