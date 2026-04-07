import { Box, Text } from '@chakra-ui/react'

function HighlightedBox() {
  return (
    <Box
      as="section"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      mt={{ base: 8, md: 10 }}
    >
      <Box maxW="1159px" mx="auto">
        <Box
          bg="neutral.825"
          borderWidth={1}
          borderColor="neutral.700"
          rounded="10px"
          p={{ base: 6, md: '25px' }}
        >
          <Text
            fontFamily="body"
            fontWeight="medium"
            color="neutral.0"
            fontSize="md"
            lineHeight={1.5}
          >
            When your cohort, community, or portfolio spans Google, Outlook, any
            calendar and people who won&apos;t share their calendar at all —
            Meetwith lets you create a reusable group once and schedule every
            future meeting in under 90 seconds.
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

export default HighlightedBox
