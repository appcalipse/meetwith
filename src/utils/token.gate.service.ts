import { ConditionRelation } from '@/types/common'
import { GateCondition, GateInterface } from '@/types/TokenGating'

import { getWalletPOAP } from './api_helper'
import { getNativeBalance, getTokenBalance } from './token.service'

export const isConditionValid = async (
  gateCondition: GateCondition,
  targetAddress: string
): Promise<boolean> => {
  if (gateCondition.elements.length > 0) {
    const isValid = []
    for (const element of gateCondition.elements) {
      let balance = 0n
      if (
        [
          GateInterface.ERC20,
          GateInterface.ERC721,
          GateInterface.ERC1155,
        ].includes(element.type)
      ) {
        balance = await getTokenBalance(
          targetAddress,
          element.itemId as `0x${string}`,
          element.chain!
        )
      } else if (element.type === GateInterface.POAP) {
        const poap = await getWalletPOAP(
          targetAddress,
          Number(parseInt(element.itemId))
        )
        balance = poap ? 1n : 0n
      } else if (element.type === GateInterface.NATIVE) {
        balance = await getNativeBalance(
          targetAddress as `0x${string}`,
          element.chain!
        )
      }

      isValid.push(balance > 0 && element.minimumBalance <= balance)
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

export const safeConvertConditionFromAPI = (
  object: GateCondition
): GateCondition => {
  for (const element of object.elements) {
    if (element.minimumBalance) {
      element.minimumBalance = BigInt(element.minimumBalance)
    }
  }
  for (let condition of object.conditions) {
    condition = safeConvertConditionFromAPI(condition)
  }
  return object
}
