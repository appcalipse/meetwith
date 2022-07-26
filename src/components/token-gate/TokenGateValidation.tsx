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
  const [gateDescription, setGateDescription] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const handleGateValidation = async (gateId: string) => {
    setLoading(true)
    const chosenGate = await getGateCondition(gateId)
    const displayGate = toHumanReadable(chosenGate!.definition!)
    setGateDescription(displayGate)
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
      <Text>{gateDescription}</Text>
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
