import {
  Button,
  ComponentWithAs,
  IconProps,
  Tag,
  useColorModeValue,
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
  disabledText?: string | null
  onClick?: () => Promise<void>
}

const PaymentMethod: FC<IProps> = props => {
  const scheduleCtx = useContext(PublicScheduleContext)
  const handleSelectPaymentMethod = scheduleCtx?.handleSelectPaymentMethod
  const setPaymentType = scheduleCtx?.setPaymentType
  const [loading, setLoading] = useState(false)
  const tagBg = useColorModeValue('neutral.100', '#2D3748')
  const handleSelect = async () => {
    setLoading(true)
    try {
      if (props.onClick) {
        setPaymentType?.(props.type)
        await props.onClick()
      } else if (handleSelectPaymentMethod) {
        await handleSelectPaymentMethod(props.type, props.step)
      }
    } finally {
      setLoading(false)
    }
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
          <Tag fontSize="sm" bg={tagBg}>
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
          {props.disabled
            ? props.disabledText !== undefined
              ? props.disabledText || props.name
              : 'Coming Soon'
            : props.name}
        </Button>
      </VStack>
    </VStack>
  )
}

export default PaymentMethod
