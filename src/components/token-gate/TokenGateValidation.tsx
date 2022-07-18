import { Box, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { Account } from '@/types/Account'
import { getGateCondition } from '@/utils/api_helper'
import { isConditionValid, toHumanReadable } from '@/utils/token.gate.service'

interface TokenGateValidationProps {
  gate: string
  targetAccount: Account
  userAccount: Account
  setIsGateValid: (isValid: boolean) => void
  isGateValid: boolean
}
const TokenGateValidation: React.FC<TokenGateValidationProps> = props => {
  const [gateToValidate, setGateToValidate] = useState<string>('')

  const handleGateValidation = async (gateId: string) => {
    const chosenGate = await getGateCondition(gateId)
    const displayGate = toHumanReadable(chosenGate!.definition!)
    setGateToValidate(displayGate)
    const isValid = await isConditionValid(
      chosenGate!.definition!,
      props.userAccount.address!
    )
    props.setIsGateValid(isValid)
  }

  useEffect(() => {
    handleGateValidation(props.gate)
  })

  return (
    <Box textAlign="center" mt={10}>
      {props.isGateValid && (
        <Text color="green.500">Your wallet has the necessary tokens</Text>
      )}
      {!props.isGateValid && (
        <Text color="red.500">
          Your wallet does not have the necessary tokens
        </Text>
      )}
      <Text>{gateToValidate}</Text>
    </Box>
  )
}

export default TokenGateValidation
