import { Box, HStack, Image, Text } from '@chakra-ui/react'
import { bg } from 'date-fns/locale'
import React, { useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { getTokenIcon } from '@/components/profile/SubscriptionDialog'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useLogin } from '@/session/login'
import { Account } from '@/types/Account'
import { AcceptedToken } from '@/types/chains'
import { GateCondition } from '@/types/TokenGating'
import { getGateCondition } from '@/utils/api_helper'
import { formatUnits } from '@/utils/generic_utils'
import {
  ConditionValidation,
  isConditionValid,
} from '@/utils/token.gate.service'

import HumanReadableGate from './HumanReadableGate'

interface TokenGateValidationProps {
  gate: string
  targetAccount: Account
  userAccount: Account
  setIsGateValid: (isValid: boolean) => void
  isGateValid: boolean
}

const TokenGateValidation: React.FC<TokenGateValidationProps> = props => {
  const [chosenGate, setChosenGate] = useState<GateCondition | null>(null)
  const [userTokens, setUserTokens] = useState<ConditionValidation['tokens']>(
    []
  )
  const [firstToken, setFirstToken] = useState<
    GateCondition['elements'][number] | undefined
  >(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const { openConnection } = useContext(OnboardingModalContext)
  const { currentAccount } = useLogin()
  const handleGateValidation = async (gateId: string) => {
    if (!gateId || gateId === 'No gate') return
    setLoading(true)
    const chosenGate = await getGateCondition(gateId)
    setChosenGate(chosenGate!.definition)
    if (props.userAccount) {
      const valid = await isConditionValid(
        chosenGate!.definition!,
        props.userAccount.address!
      )
      props.setIsGateValid(valid.isValid)
      const userTokens = valid.tokens
      const token = chosenGate?.definition?.elements.find(val => {
        const userToken = userTokens.find(
          userToken => userToken.symbol === val.itemSymbol
        )
        if (valid.isValid) {
          return val.minimumBalance <= (userToken?.balance || 0)
        } else {
          return val.minimumBalance > (userToken?.balance || 0)
        }
      })
      setFirstToken(token)
    } else {
      setFirstToken(chosenGate?.definition?.elements[0])
      props.setIsGateValid(false)
    }

    setLoading(false)
  }

  useEffect(() => {
    handleGateValidation(props.gate)
  }, [props.gate, currentAccount])
  const bgColor = !props.userAccount
    ? '#FFC700'
    : props.isGateValid
    ? 'neutral.900'
    : '#F3B5B4'
  return loading ? (
    <Box
      mt={10}
      position="absolute"
      top={-44}
      mx={'auto'}
      w={'fit-content'}
      insetX={'0'}
      transform={'scale(0.9)'}
    >
      <Loading />
    </Box>
  ) : (
    <Box
      textAlign="left"
      mt={10}
      position="absolute"
      top={-36}
      mx={'auto'}
      w={'fit-content'}
      insetX={'0'}
      bg={bgColor}
      maxW={'500px'}
      p={4}
      rounded={'lg'}
      fontWeight={'500'}
    >
      {!props.userAccount && firstToken && (
        <HStack gap={4} color="neutral.900">
          {getTokenIcon(firstToken.itemSymbol as AcceptedToken) && (
            <Image
              src={getTokenIcon(firstToken.itemSymbol as AcceptedToken)}
              alt={firstToken.itemSymbol}
              w={30}
              h={30}
            />
          )}
          <Text>
            You need to hold{' '}
            {formatUnits(firstToken.minimumBalance, firstToken.decimals || 0)}{' '}
            {firstToken.itemSymbol} to be eligible to schedule this meeting.
            Please sign in to check.
          </Text>
          <Text
            cursor="pointer"
            whiteSpace="nowrap"
            onClick={() => {
              openConnection(false)
            }}
          >
            Sign In
          </Text>
        </HStack>
      )}
      {props.isGateValid && props.userAccount && firstToken && (
        <HStack gap={4}>
          {getTokenIcon(firstToken.itemSymbol as AcceptedToken) && (
            <Image
              src={getTokenIcon(firstToken.itemSymbol as AcceptedToken)}
              alt={firstToken.itemSymbol}
              w={30}
              h={30}
            />
          )}
          <Text>
            Congratulations. You are eligible to schedule this meeting because
            you hold{' '}
            {formatUnits(firstToken.minimumBalance, firstToken.decimals || 0)}{' '}
            {firstToken.itemSymbol}
          </Text>
        </HStack>
      )}
      {!props.isGateValid && props.userAccount && firstToken && (
        <HStack gap={4}>
          {getTokenIcon(firstToken.itemSymbol as AcceptedToken) && (
            <Image
              src={getTokenIcon(firstToken.itemSymbol as AcceptedToken)}
              alt={firstToken.itemSymbol}
              w={30}
              h={30}
            />
          )}
          <Text color="neutral.900">
            You need to hold{' '}
            {formatUnits(firstToken.minimumBalance, firstToken.decimals || 0)}{' '}
            {firstToken.itemSymbol} to be eligible to schedule this meeting.
          </Text>
        </HStack>
      )}
    </Box>
  )
}

export default TokenGateValidation
