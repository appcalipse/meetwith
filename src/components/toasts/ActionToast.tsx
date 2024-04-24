import { CloseIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  HStack,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'

const ActionToast: React.FC<{
  description: string
  cta: string
  action: () => void
  close: () => void
}> = ({ description, cta, close, action }) => {
  const color = useColorModeValue('gray.800', 'white')
  const bgColor = useColorModeValue('white', '#1F2933')
  return (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      gap={3}
      width="100%"
      bgColor={bgColor}
      py={3}
      px={4}
      borderRadius="lg"
      border={'1px'}
      borderColor="neutral.600"
      borderStyle="inset"
    >
      <InfoIcon cursor="pointer" color={color} ml={2} />
      <Text>{description}</Text>
      <HStack gap={2.5}>
        <Button variant="text" color="primary.200" onClick={action}>
          {cta}
        </Button>
        <CloseIcon w={2.5} h={2.5} onClick={close} cursor="pointer" />
      </HStack>
    </HStack>
  )
}

export default ActionToast
