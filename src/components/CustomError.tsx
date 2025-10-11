import { Box, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'

interface CustomErrorProps {
  title: string
  description: string
  imageSrc?: string
  imageAlt?: string
}

const CustomError: React.FC<CustomErrorProps> = ({
  title,
  description,
  imageSrc = '/assets/404.svg',
  imageAlt = 'Error illustration',
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minH="400px"
      px={8}
      py={12}
      bg="bg-surface"
      borderRadius="12px"
      border="1px solid"
      borderColor="border-subtle"
    >
      <VStack spacing={6} align="center" maxW="400px">
        <Box position="relative" width="200px" height="200px">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            style={{ objectFit: 'contain' }}
          />
        </Box>
        <VStack spacing={3} align="center" textAlign="center">
          <Text
            fontSize="20px"
            fontWeight="600"
            color="text-primary"
            lineHeight="1.3"
          >
            {title}
          </Text>
          <Text
            fontSize="16px"
            color="text-secondary"
            lineHeight="1.5"
            maxW="350px"
          >
            {description}
          </Text>
        </VStack>
      </VStack>
    </Box>
  )
}

export default CustomError
