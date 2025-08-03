import {
  Button,
  ComponentWithAs,
  IconProps,
  Tag,
  VStack,
} from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import { PaymentStep, PaymentType } from '@utils/constants/meeting-types'
import React, { FC, useContext, useState } from 'react'

interface IProps {
  id: string
  name: string
  tag?: string
  step: PaymentStep
  icon: ComponentWithAs<'svg', IconProps>
  type: PaymentType
  disabled?: boolean
}

const PaymentMethod: FC<IProps> = props => {
  const { handleSelectPaymentMethod } = useContext(PublicScheduleContext)
  const [loading, setLoading] = useState(false)
  const handleSelect = async () => {
    setLoading(true)
    await handleSelectPaymentMethod(props.type, props.step)
    setLoading(false)
  }
  return (
    <VStack
      p={4}
      rounded={'lg'}
      alignItems={'flex-start'}
      flex={1}
      gap={6}
      height="auto"
      justifyContent="space-between"
      borderWidth={1}
      borderColor={'neutral.400'}
    >
      <props.icon
        width={'auto'}
        h={
          props.step === PaymentStep.SELECT_CRYPTO_NETWORK
            ? 16
            : props.step === PaymentStep.HANDLE_SEND_INVOICE
            ? '70px'
            : 12
        }
        mx="auto"
      />
      <VStack gap={4} w={'100%'} alignItems={'flex-start'}>
        {props.tag && (
          <Tag fontSize="sm" bg="#2D3748">
            {props.tag}
          </Tag>
        )}
        <Button
          colorScheme="primary"
          w={'full'}
          onClick={handleSelect}
          isLoading={loading}
          isDisabled={props.disabled}
        >
          {props.disabled ? 'Coming Soon' : props.name}
        </Button>
      </VStack>
    </VStack>
  )
}

export default PaymentMethod
