import { Button, ButtonProps, LinkProps } from '@chakra-ui/react'
import { BiWallet } from 'react-icons/bi'

const MWWButton: React.FC<ButtonProps & LinkProps> = prop => {
  return (
    <Button
      {...prop}
      bg={'primary.400'}
      color={'neutral.0'}
      transition="0.3s"
      colorScheme="orangeButton"
      _hover={{ bg: 'primary.600' }}
      leftIcon={<BiWallet />}
    />
  )
}

export default MWWButton
