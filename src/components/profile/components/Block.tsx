import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react'
import { ReactNode } from 'react'

const Block: React.FC<{ children: ReactNode } & BoxProps> = ({
  children,
  ...props
}) => {
  const bgColor = useColorModeValue('white', 'neutral.900')

  return (
    <Box borderRadius={16} p={8} bgColor={bgColor} {...props} w="100%">
      {children}
    </Box>
  )
}

export default Block
