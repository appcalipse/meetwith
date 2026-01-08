import { InfoIcon } from '@chakra-ui/icons'
import { Tooltip, useColorModeValue } from '@chakra-ui/react'

const InfoTooltip: React.FC<{ text: string; ml?: number }> = ({
  text,
  ml = 2,
}) => {
  const color = useColorModeValue('gray.800', 'white')

  return (
    <Tooltip label={text}>
      <InfoIcon cursor="pointer" color={color} ml={ml} mb={1} />
    </Tooltip>
  )
}

export default InfoTooltip
