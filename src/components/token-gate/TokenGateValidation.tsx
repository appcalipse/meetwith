import { Box, Text } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'

import { Account } from '@/types/Account'
import { GateCondition } from '@/types/TokenGating'
import { getGateCondition } from '@/utils/api_helper'
import { isConditionValid } from '@/utils/token.gate.service'

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
  const [loading, setLoading] = useState<boolean>(true)

  const handleGateValidation = async (gateId: string) => {
    setLoading(true)
    const chosenGate = await getGateCondition(gateId)

    setChosenGate(chosenGate!.definition)
    if (props.userAccount) {
      const isValid = await isConditionValid(
        chosenGate!.definition!,
        props.userAccount.address!
      )
      props.setIsGateValid(isValid)
    } else {
      props.setIsGateValid(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    handleGateValidation(props.gate)
  }, [props.gate])

  return (
    <Box textAlign="center" mt={10}>
      {!loading && <HumanReadableGate gateCondition={chosenGate!} center />}
      {!loading && props.isGateValid && (
        <Text color="green.500">Your wallet has the necessary tokens</Text>
      )}
      {!loading && !props.isGateValid && (
        <Text color="red.500">
          Your wallet does not have the necessary tokens
        </Text>
      )}
    </Box>
  )
}

export default TokenGateValidation
