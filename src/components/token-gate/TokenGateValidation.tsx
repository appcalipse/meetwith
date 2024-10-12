import { Box, HStack, Image, Text } from '@chakra-ui/react'
import React, { useContext, useEffect, useState } from 'react'

import Loading from '@/components/Loading'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useLogin } from '@/session/login'
import { Account } from '@/types/Account'
import { SupportedChain, supportedChains } from '@/types/chains'
import { GateCondition } from '@/types/TokenGating'
import { getGateCondition } from '@/utils/api_helper'
import { formatUnits } from '@/utils/generic_utils'
import {
  ConditionValidation,
  isConditionValid,
} from '@/utils/token.gate.service'
import { getTokenMeta } from '@/utils/token.service'

interface TokenGateValidationProps {
  gate: string
  targetAccount: Account
  userAccount: Account
  setIsGateValid: (isValid: boolean) => void
  isGateValid: boolean
}
export const getChainImage = (chain: SupportedChain) => {
  return supportedChains.find(val => val.chain === chain)?.image
}
const TokenGateValidation: React.FC<TokenGateValidationProps> = props => {
  const [chosenGate, setChosenGate] = useState<GateCondition | null>(null)
  const [userTokens, setUserTokens] = useState<ConditionValidation['tokens']>(
    []
  )
  const { currentAccount } = useLogin()
  const [firstToken, setFirstToken] = useState<
    (GateCondition['elements'][number] & { image?: string }) | undefined
  >(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const { openConnection } = useContext(OnboardingModalContext)
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
          return val.minimumBalance >= (userToken?.balance || 0)
        }
      })
      const tokenImage =
        token?.type === 'native'
          ? getChainImage(token.chain as SupportedChain)
          : (
              await getTokenMeta(
                token?.chain?.toLowerCase() || '',
                token?.itemId || ''
              )
            )?.image?.large
      setFirstToken(token ? { ...token, image: tokenImage } : undefined)
    } else {
      const token = chosenGate?.definition?.elements[0]
      const tokenImage =
        token?.type === 'native'
          ? getChainImage(token.chain as SupportedChain)
          : (
              await getTokenMeta(
                token?.chain?.toLowerCase() || '',
                token?.itemId || ''
              )
            )?.image?.large
      setFirstToken(token ? { ...token, image: tokenImage } : undefined)
      props.setIsGateValid(false)
    }

    setLoading(false)
  }

  useEffect(() => {
    void handleGateValidation(props.gate)
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
      top={{ md: -36, base: !props.userAccount ? -44 : -40 }}
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
          {firstToken.image && (
            <Image
              src={firstToken.image}
              alt={firstToken.itemSymbol}
              w="34px"
              h="34px"
              borderRadius={999}
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
              openConnection(undefined, false)
            }}
          >
            Sign In
          </Text>
        </HStack>
      )}
      {props.isGateValid && props.userAccount && firstToken && (
        <HStack gap={4}>
          {firstToken.image && (
            <Image
              src={firstToken.image}
              alt={firstToken.itemSymbol}
              w="34px"
              h="34px"
              borderRadius={999}
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
          {firstToken.image && (
            <Image
              src={firstToken.image}
              alt={firstToken.itemSymbol}
              w="34px"
              h="34px"
              borderRadius={999}
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
