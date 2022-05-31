import { ConditionRelation, GateCondition } from '@/types/TokenGating'

import { getTokenBalance } from './token.service'

export const isConditionValid = async (
  gateCondition: GateCondition,
  targetAddress: string
): Promise<boolean> => {
  if (gateCondition.elements.length > 0) {
    const isValid = []
    for (const element of gateCondition.elements) {
      const balance = await getTokenBalance(
        targetAddress,
        element.tokenAddress,
        element.chain
      )
      isValid.push(element.minimumBalance.lte(balance))
    }
    if (gateCondition.relation === ConditionRelation.AND) {
      return isValid.every(valid => valid === true)
    } else {
      return isValid.some(valid => valid === true)
    }
  } else {
    const isValid = []
    for (const condition of gateCondition.conditions) {
      isValid.push(await isConditionValid(condition, targetAddress))
    }
    if (gateCondition.relation === ConditionRelation.AND) {
      return isValid.every(valid => valid === true)
    } else {
      return isValid.some(valid => valid === true)
    }
  }
}
