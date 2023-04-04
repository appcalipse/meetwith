import { Box, Button, Flex, HStack, Image, Link } from '@chakra-ui/react'

export function MainMenu() {
  return (
    <Box py={9} maxW="1360px" mx="auto" px={{ base: 2, md: 10 }}>
      <HStack justifyContent="space-between">
        <Flex gap={16}>
          <Image src={'/assets/logo.svg'} />
          <HStack color="neutral.100" gap={8}>
            <Link>Home</Link>
            <Link>Features</Link>
            <Link>Plans</Link>
            <Link>FAQ</Link>
            <Link>Contact</Link>
          </HStack>
        </Flex>

        <Button>Sign In</Button>
      </HStack>
    </Box>
  )
}
