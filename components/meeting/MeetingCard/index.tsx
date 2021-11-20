import { Badge, Box } from "@chakra-ui/layout"
import { Meeting } from "../../../types/Meeting"

interface MeetingCardProps {
    meeting: Meeting
}
export default ({ meeting }: MeetingCardProps) => {
    return (
        <Box boxShadow="base" maxW="lg" borderWidth="1px" borderRadius="lg" overflow="hidden">

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
                        Source: {meeting.source.address}
                    </Box>
                </Box>

                <Box
                    mt="1"
                    fontWeight="semibold"
                    as="h4"
                    lineHeight="tight"
                    isTruncated
                >
                    Target: {meeting.target.address}
                </Box>

                <Box>
                    {meeting.startTime.format("MMM DD, YYYY")}
                </Box>

                <Box>
                    {meeting.endTime.format("MMM DD, YYYY")}
                </Box>
            </Box>
        </Box>
    )
}