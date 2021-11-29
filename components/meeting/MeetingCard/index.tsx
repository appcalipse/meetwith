import {Badge, Box} from '@chakra-ui/layout';
import {MeetingEncrypted} from '../../../types/Meeting';

interface MeetingCardProps {
  meeting: MeetingEncrypted;
}
const MeetingCard = ({meeting}: MeetingCardProps) => {
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
            Source: {meeting}
          </Box>
        </Box>

        <Box
          mt="1"
          fontWeight="semibold"
          as="h4"
          lineHeight="tight"
          isTruncated
        >
          Target: {meeting}
        </Box>

        <Box>{meeting.startTime.format('MMM DD, YYYY')}</Box>

        <Box>{meeting.endTime.format('MMM DD, YYYY')}</Box>
      </Box>
    </Box>
  );
};

export default MeetingCard;
