import { InfoIcon } from '@chakra-ui/icons'
import { Tooltip, useColorModeValue } from '@chakra-ui/react'

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const color = useColorModeValue('gray.800', 'white')

  return (
    <Tooltip label={text}>
      <InfoIcon cursor="pointer" color={color} ml={2} />
    </Tooltip>
  )
}

export default InfoTooltip
