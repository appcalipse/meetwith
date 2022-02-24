import { BigNumber, ethers } from 'ethers'

import { ERC20 } from '../abis/erc20'
import { MWWRegister } from '../abis/mww'
import { Account } from '../types/Account'
import { AcceptedToken, getChainInfo, SupportedChain } from '../types/chains'
import {
  BlockchainSubscription,
  getPlanInfo,
  Plan,
  Subscription,
} from '../types/Subscription'
import { getSubscriptionForDomain, syncSubscriptions } from './api_helper'

const YEAR_DURATION = 31536000

export const isProAccount = (account: Account): boolean => {
  return account.subscriptions?.some(sub => sub.plan_id === Plan.PRO)
}

export const checkAllowance = async (
  accountAddress: string,
  plan: Plan,
  chain: SupportedChain,
  token: AcceptedToken,
  duration: number
): Promise<BigNumber> => {
  if (!window.ethereum) {
    throw Error('Please connect a wallet')
  }
  const price = getPlanInfo(plan)?.usdPrice
  if (price) {
    const chainInfo = getChainInfo(chain)
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const tokenInfo = chainInfo!.acceptableTokens.find(
      _token => _token.token === token
    )
    if (!tokenInfo) {
      throw Error('Token not accepted')
    }
    const tokenContract = new ethers.Contract(
      tokenInfo.contractAddress,
      ERC20,
      provider.getSigner()
    )
    const decimals = await tokenContract.decimals()
    const allowance = await tokenContract.allowance(
      accountAddress.toLocaleLowerCase(),
      chainInfo!.registerContractAddress
    )
    const amount = ethers.utils
      .parseUnits(price.toString(), decimals)
      .mul(duration)
      .div(YEAR_DURATION)
    if (allowance.lt(amount)) {
      return amount.sub(allowance)
    } else {
      return BigNumber.from(0)
    }
  } else {
    throw new Error(`Plan does not exists`)
  }
}

export const getNativePriceForDuration = async (
  plan: Plan,
  duration: number,
  chain: SupportedChain
): Promise<BigNumber> => {
  if (!window.ethereum) {
    throw Error('Please connect a wallet')
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const chainInfo = getChainInfo(chain)
  const planInfo = getPlanInfo(plan)
  if (planInfo) {
    const price = planInfo.usdPrice
    const contract = new ethers.Contract(
      chainInfo!.registerContractAddress,
      MWWRegister,
      provider.getSigner()
    )
    const value = (
      await contract.getNativeConvertedValue(planInfo.usdPrice)
    ).amountInNative
      .mul(duration)
      .div(YEAR_DURATION)

    return value
  } else {
    throw new Error(`Plan does not exists`)
  }
}

export const subscribeToPlan = async (
  accountAddress: string,
  plan: Plan,
  chain: SupportedChain,
  duration: number,
  domain: string,
  token?: AcceptedToken
): Promise<Subscription> => {
  if (!window.ethereum) {
    throw Error('Please connect a wallet')
  }

  const subExists = await getSubscriptionForDomain(domain)
  if (subExists) {
    throw Error('Domain already registered')
  }

  const chainInfo = getChainInfo(chain)
  const provider = new ethers.providers.Web3Provider(window.ethereum)

  if ((await provider.getNetwork()).chainId !== chainInfo?.id) {
    throw Error(`Please switch you wallet to ${chainInfo?.name}`)
  }

  const contract = new ethers.Contract(
    chainInfo!.registerContractAddress,
    MWWRegister,
    provider.getSigner()
  )

  try {
    let sub: BlockchainSubscription
    if (token) {
      const tokenInfo = chainInfo!.acceptableTokens.find(
        _token => _token.token === token
      )
      if (!tokenInfo) {
        throw Error('Token not accepted')
      }
      const missingApproval = await checkAllowance(
        accountAddress,
        plan,
        chain,
        token,
        duration
      )

      if (missingApproval.gt(0)) {
        const tokenContract = new ethers.Contract(
          tokenInfo.contractAddress,
          ERC20,
          provider.getSigner()
        )
        await tokenContract.approve(
          chainInfo!.registerContractAddress,
          missingApproval
        )
      }

      sub = await contract.purchaseWithToken(
        tokenInfo.contractAddress,
        plan,
        accountAddress.toLocaleLowerCase(),
        duration,
        domain,
        ''
      )
    } else {
      const planInfo = getPlanInfo(plan)
      if (!planInfo) {
        throw Error('Plan does not exists')
      }
      const value = (
        await contract.getNativeConvertedValue(planInfo.usdPrice)
      ).amountInNative
        .mul(duration)
        .div(YEAR_DURATION)
      sub = await contract.purchaseWithNative(
        plan,
        accountAddress.toLocaleLowerCase(),
        duration,
        domain,
        '',
        { value }
      )
    }

    await syncSubscriptions()

    return convertBlockchainSubscriptionToSubscription(sub)
  } catch (error) {
    throw error
  }
}

export const convertBlockchainSubscriptionToSubscription = (
  sub: BlockchainSubscription
): Subscription => {
  const subscriptionInfo: Subscription = {
    plan_id: sub.planId.toNumber(),
    chain: sub.chain,
    owner_account: sub.owner.toLowerCase(),
    expiry_time:
      new Date(sub.expiryTime.toNumber() * 1000).getFullYear() < 2200
        ? new Date(sub.expiryTime.toNumber() * 1000)
        : new Date(2200, 1, 1),
    domain: sub.domain,
    config_ipfs_hash: sub.configIpfsHash,
    registered_at: new Date(sub.registeredAt.toNumber() * 1000),
  }

  return subscriptionInfo
}
