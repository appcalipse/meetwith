import { Box, Image, keyframes, Text } from '@chakra-ui/react'

const Loading: React.FC<{ label?: string }> = ({ label }) => {
  const spin = keyframes`
    50% {
        transform: rotate(360deg) scale(0.7, 0.7);
        border-width: 8px;
      }
      100% {
        transform: rotate(720deg) scale(1, 1);
        border-width: 3px;
      }
`

  return (
    <Box textAlign="center" width="6rem">
      <Box position="relative">
        <Image
          boxSize="3rem"
          src="/assets/logo.svg"
          alt="Meetwith"
          position="absolute"
          left="1.5rem"
          top="1.5rem"
        />

        <Box
          position="absolute"
          width="6rem"
          height="6rem"
          border="1px solid transparent"
          borderTopColor="primary.400"
          borderBottomColor="primary.400"
          borderRadius="50%"
          animation={`${spin} 2s ease infinite`}
        ></Box>
      </Box>

      <Text fontSize="sm" pt="7rem">
        {label !== undefined ? label : 'Loading...'}
      </Text>
    </Box>
  )
}

export default Loading
