import { CloseIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  Heading,
  HStack,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'

const ActionToast: React.FC<{
  description: string
  title: string
  cta: string
  action: () => void
  close: () => void
}> = ({ description, title, cta, close, action }) => {
  const color = useColorModeValue('gray.800', 'white')
  const bgColor = useColorModeValue('white', '#1F2933')
  const borderColor = useColorModeValue('transparent', 'neutral.600')
  const buttonColor = useColorModeValue('primary.600', 'primary.200')
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
      borderColor={borderColor}
      borderStyle="inset"
    >
      <InfoIcon cursor="pointer" color={color} ml={2} />
      <VStack alignItems="flex-start" gap={0}>
        <Heading size="base" fontWeight="700">
          {title}
        </Heading>
        <Text>{description}</Text>
      </VStack>
      <HStack gap={2.5}>
        <Button variant="text" color={buttonColor} onClick={action}>
          {cta}
        </Button>
        <CloseIcon w={2.5} h={2.5} onClick={close} cursor="pointer" />
      </HStack>
    </HStack>
  )
}

export default ActionToast
