import {
  As,
  Button,
  ButtonProps,
  LinkProps,
  useColorModeValue,
} from '@chakra-ui/react'

const MWWButton: React.FC<ButtonProps & LinkProps> = prop => {
  const bgColor = useColorModeValue(
    'linear(to-r,orange.500 55%, yellow.400)',
    'linear(to-r,orange.300 45%, yellow.500)'
  )
  const bgColorHover = useColorModeValue(
    'linear(to-r,orange.400 45%, yellow.300)',
    'linear(to-r,orange.400 45%, yellow.500)'
  )
  return (
    <Button
      {...prop}
      bgGradient={bgColor}
      transition="0.3s"
      colorScheme="orange"
      _hover={{ bgGradient: bgColorHover }}
    />
  )
}

export default MWWButton
