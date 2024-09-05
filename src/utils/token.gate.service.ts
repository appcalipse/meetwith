import { ConditionRelation } from '@/types/common'
import { GateCondition, GateInterface } from '@/types/TokenGating'

import { getWalletPOAP } from './api_helper'
import { getNativeBalance, getTokenBalance } from './token.service'
export interface ConditionValidation {
  tokens: Array<{
    balance: bigint
    symbol: string
    relation: ConditionRelation
  }>
  isValid: boolean
}
export const isConditionValid = async (
  gateCondition: GateCondition,
  targetAddress: string
): Promise<ConditionValidation> => {
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

      isValid.push({
        valid: balance > 0 && element.minimumBalance <= balance,
        balance,
        symbol: element.itemSymbol,
      })
    }
    if (gateCondition.relation === ConditionRelation.AND) {
      return {
        isValid: isValid.every(valid => valid.valid === true),
        tokens: isValid.map(val => ({
          balance: val.balance,
          symbol: val.symbol,
          relation: gateCondition.relation,
        })),
      }
    } else {
      return {
        isValid: isValid.some(valid => valid.valid === true),
        tokens: isValid.map(val => ({
          balance: val.balance,
          symbol: val.symbol,
          relation: gateCondition.relation,
        })),
      }
    }
  } else {
    const isValid = []
    for (const condition of gateCondition.conditions) {
      isValid.push(await isConditionValid(condition, targetAddress))
    }
    if (gateCondition.relation === ConditionRelation.AND) {
      return {
        isValid: isValid.every(valid => valid.isValid === true),
        tokens: isValid.map(val => val.tokens).flat(),
      }
    } else {
      return {
        isValid: isValid.some(valid => valid.isValid === true),
        tokens: isValid.map(val => val.tokens).flat(),
      }
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
