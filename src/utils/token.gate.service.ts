import { BigNumber } from 'ethers'

import {
  ConditionRelation,
  GateCondition,
  TokenInterface,
} from '@/types/TokenGating'

import { getWalletPOAP } from './api_helper'
import { getTokenBalance } from './token.service'

export const isConditionValid = async (
  gateCondition: GateCondition,
  targetAddress: string
): Promise<boolean> => {
  if (gateCondition.elements.length > 0) {
    const isValid = []
    for (const element of gateCondition.elements) {
      let balance = BigNumber.from(0)
      if (
        [
          TokenInterface.ERC20,
          TokenInterface.ERC721,
          TokenInterface.ERC1155,
        ].includes(element.type)
      ) {
        balance = await getTokenBalance(
          targetAddress,
          element.tokenAddress,
          element.chain!
        )
      } else if (element.type === TokenInterface.POAP) {
        const poap = await getWalletPOAP(
          targetAddress,
          Number(parseInt(element.tokenAddress))
        )
        balance = BigNumber.from(poap ? 1 : 0)
      }

      isValid.push(balance.gt(0) && element.minimumBalance.lte(balance))
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
      element.minimumBalance = BigNumber.from(element.minimumBalance)
    }
  }
  for (let condition of object.conditions) {
    condition = safeConvertConditionFromAPI(condition)
  }
  return object
}

export const toHumanReadable = (gateCondition: GateCondition): string => {
  let text = 'User must hold '
  if (gateCondition.elements.length > 0) {
    for (let i = 0; i < gateCondition.elements.length; i++) {
      const element = gateCondition.elements[i]
      if (element.minimumBalance && !element.minimumBalance.isZero()) {
        let amount = element.minimumBalance
        if (element.decimals) {
          amount = amount.div(
            BigNumber.from((10 ** element.decimals).toString())
          )
        }
        text += `${amount.toNumber()} of `
      }
      text += `${element.tokenName} (${element.tokenSymbol})`
      if (gateCondition.elements.length !== i + 1) {
        if (gateCondition.relation === ConditionRelation.AND) {
          text += ' and '
        } else {
          text += ' or '
        }
      }
    }
  }
  return text
}
