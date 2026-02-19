import { InfoIcon } from '@chakra-ui/icons'
import { Tooltip, useColorModeValue } from '@chakra-ui/react'

const InfoTooltip: React.FC<{ text: string; mb?: number | string }> = ({
  text,
  mb = 1,
}) => {
  const color = useColorModeValue('gray.800', 'white')

  return (
    <Tooltip label={text}>
      <InfoIcon cursor="pointer" color={color} ml={2} mb={mb} />
    </Tooltip>
  )
}

export default InfoTooltip
