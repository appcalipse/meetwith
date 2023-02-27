import { Button, ButtonProps, LinkProps } from '@chakra-ui/react'
import { BiWallet } from 'react-icons/bi'

const MWWButton: React.FC<ButtonProps & LinkProps> = prop => {
  return (
    <Button
      {...prop}
      color={'neutral.50'}
      colorScheme="orangeButton"
      leftIcon={<BiWallet />}
    />
  )
}

export default MWWButton
