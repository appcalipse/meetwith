import { Box, HStack, Text } from '@chakra-ui/react'
import { PublicSchedulingSteps } from '@utils/constants/meeting-types'
import React, { FC } from 'react'
interface IProps {
  label: string
  activeSteps: PublicSchedulingSteps[]
  currentStep: PublicSchedulingSteps
}
const ProgressHeaderItem: FC<IProps> = props => {
  return (
    <HStack
      flex={1}
      gap={3}
      alignItems="center"
      px={4}
      py={1}
      rounded={'full'}
      bg={'neutral.825'}
    >
      {props.activeSteps.includes(props.currentStep) ? (
        <Box
          bg={'primary.400'}
          w={{ md: '44px', base: '24px' }}
          h={{ md: '44px', base: '24px' }}
          borderWidth={{ md: 8, base: 4 }}
          borderColor="primary.100"
          rounded={'100%'}
          display="block"
          flexBasis={{ md: '44px', base: '24px' }}
        />
      ) : (
        <Box
          w={{ md: '44px', base: '24px' }}
          h={{ md: '44px', base: '24px' }}
          bg={'primary.100'}
          display="block"
          rounded={'100%'}
          flexBasis={{ md: '44px', base: '24px' }}
        />
      )}
      <Text fontSize={{ md: 'lg', base: 'sm' }} fontWeight={700}>
        {props.label}
      </Text>
    </HStack>
  )
}

export default ProgressHeaderItem
