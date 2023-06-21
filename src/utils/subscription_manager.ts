import { TransactionResponse } from '@ethersproject/abstract-provider'
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
import { YEAR_DURATION_IN_SECONDS } from './constants'
import { validateChainToActOn } from './rpc_helper_front'
import { connectedProvider } from './user_manager'

export const isProAccount = (account?: Account): boolean => {
  return Boolean(getActiveProSubscription(account))
}

export const getActiveProSubscription = (
  account?: Account
): Subscription | undefined => {
  return account?.subscriptions?.find(
    sub => sub.plan_id === Plan.PRO && new Date(sub.expiry_time) > new Date()
  )
}

export const checkAllowance = async (
  accountAddress: string,
  plan: Plan,
  chain: SupportedChain,
  token: AcceptedToken,
  duration: number
): Promise<BigNumber> => {
  if (!connectedProvider) {
    throw Error('Please connect a wallet')
  }
  const price = getPlanInfo(plan)?.usdPrice
  if (price) {
    const chainInfo = getChainInfo(chain)

    const provider = new ethers.providers.Web3Provider(connectedProvider, 'any')

    try {
      await validateChainToActOn(chain, provider)
    } catch (e) {
      throw Error('Please connect to the correct network')
    }

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
      chainInfo!.registarContractAddress
    )
    const amount = ethers.utils
      .parseUnits(price.toString(), decimals)
      .mul(duration)
      .div(YEAR_DURATION_IN_SECONDS)
    if (allowance.lt(amount)) {
      return amount
    } else {
      return 0n
    }
  } else {
    throw new Error(`Plan does not exists`)
  }
}

export const approveTokenSpending = async (
  chain: SupportedChain,
  token: AcceptedToken,
  amount: BigNumber
): Promise<void> => {
  const chainInfo = getChainInfo(chain)
  const provider = new ethers.providers.Web3Provider(connectedProvider, 'any')

  try {
    await validateChainToActOn(chain, provider)
  } catch (e) {
    throw Error('Please connect to the correct network')
  }

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

  const tx = await tokenContract.approve(
    chainInfo!.registarContractAddress,
    amount
  )
  await tx.wait()
}

export const getNativePriceForDuration = async (
  plan: Plan,
  duration: number,
  chain: SupportedChain
): Promise<BigNumber> => {
  if (!connectedProvider) {
    throw Error('Please connect a wallet')
  }

  const provider = new ethers.providers.Web3Provider(connectedProvider, 'any')
  const chainInfo = getChainInfo(chain)
  const planInfo = getPlanInfo(plan)
  if (planInfo) {
    const price = planInfo.usdPrice
    const contract = new ethers.Contract(
      chainInfo!.registarContractAddress,
      MWWRegister,
      provider.getSigner()
    )
    const value = (
      await contract.getNativeConvertedValue(planInfo.usdPrice)
    ).amountInNative
      .mul(duration)
      .div(YEAR_DURATION_IN_SECONDS)

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
  token: AcceptedToken
): Promise<TransactionResponse> => {
  if (!connectedProvider) {
    throw Error('Please connect a wallet')
  }

  try {
    const subExists = await getSubscriptionForDomain(domain)
    if (subExists && subExists!.owner_account !== accountAddress) {
      throw Error('Domain already registered')
    }
  } catch (e: any) {
    if (e.status !== 404) {
      throw e
    }
  }

  const chainInfo = getChainInfo(chain)
  const provider = new ethers.providers.Web3Provider(connectedProvider, 'any')

  try {
    await validateChainToActOn(chain, provider)
  } catch (e) {
    throw Error('Please connect to the correct network')
  }

  const contract = new ethers.Contract(
    chainInfo!.registarContractAddress,
    MWWRegister,
    provider.getSigner()
  )

  try {
    let tx: TransactionResponse
    const tokenInfo = chainInfo!.acceptableTokens.find(
      _token => _token.token === token
    )

    if (tokenInfo?.contractAddress !== ethers.constants.AddressZero) {
      if (!tokenInfo) {
        throw Error('Token not accepted')
      }
      const neededApproval = await checkAllowance(
        accountAddress,
        plan,
        chain,
        token,
        duration
      )

      if (neededApproval.gt(0)) {
        const tokenContract = new ethers.Contract(
          tokenInfo.contractAddress,
          ERC20,
          provider.getSigner()
        )
        await tokenContract.approve(
          chainInfo!.registarContractAddress,
          neededApproval
        )
      }

      tx = await contract.purchaseWithToken(
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
        .div(YEAR_DURATION_IN_SECONDS)

      tx = await contract.purchaseWithNative(
        plan,
        accountAddress.toLocaleLowerCase(),
        duration,
        domain,
        '',
        { value }
      )
    }
    return tx
  } catch (error) {
    // TODO handle insufficient funds error
    throw error
  }
}

export const confirmSubscription = async (
  tx: TransactionResponse,
  domain: string
): Promise<Subscription | undefined> => {
  await tx.wait()
  const subscriptions = await syncSubscriptions()
  return subscriptions.find(sub => sub.domain === domain)
}

export const convertBlockchainSubscriptionToSubscription = (
  sub: BlockchainSubscription
): Subscription => {
  let expiryTime = sub.expiryTime.toNumber()

  if (expiryTime.toString().length === 13) {
    //bad domain adding with expiry in milliseconds and not seconds
    expiryTime = expiryTime / 1000
  }

  const subscriptionInfo: Subscription = {
    plan_id: sub.planId.toNumber(),
    chain: sub.chain,
    owner_account: sub.owner.toLowerCase(),
    expiry_time:
      new Date(expiryTime * 1000).getFullYear() < 2200
        ? new Date(expiryTime * 1000)
        : new Date(2200, 1, 1), // bad initial domain injections
    domain: sub.domain,
    config_ipfs_hash: sub.configIpfsHash,
    registered_at: new Date(sub.registeredAt.toNumber() * 1000),
  }

  return subscriptionInfo
}
