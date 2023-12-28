import * as Sentry from '@sentry/nextjs'
import {
  GetWalletClientResult,
  prepareWriteContract,
  readContract,
  waitForTransaction,
  writeContract,
  WriteContractResult,
} from '@wagmi/core'
import { parseUnits, TransactionReceipt, zeroAddress } from 'viem'

import { ERC20 } from '../abis/erc20'
import { MWWDomain, MWWRegister } from '../abis/mww'
import { Account } from '../types/Account'
import { AcceptedToken, getChainInfo, SupportedChain } from '../types/chains'
import {
  BlockchainSubscription,
  getPlanInfo,
  Plan,
  Subscription,
} from '../types/Subscription'
import { getSubscriptionByDomain, syncSubscriptions } from './api_helper'
import { YEAR_DURATION_IN_SECONDS } from './constants'
import { checkTransactionError, validateChainToActOn } from './rpc_helper_front'

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
  accountAddress: `0x${string}`,
  plan: Plan,
  chain: SupportedChain,
  token: AcceptedToken,
  duration: number,
  walletClient?: GetWalletClientResult
): Promise<bigint> => {
  const price = getPlanInfo(plan)?.usdPrice
  if (price) {
    const chainInfo = getChainInfo(chain)

    try {
      await validateChainToActOn(chain, walletClient)
    } catch (e) {
      throw Error('Please connect to the correct network')
    }

    const tokenInfo = chainInfo!.acceptableTokens.find(
      _token => _token.token === token
    )
    if (!tokenInfo) {
      throw Error('Token not accepted')
    }

    const info = {
      address: tokenInfo.contractAddress as `0x${string}`,
      chainId: chainInfo!.id,
      abi: ERC20,
    }

    const decimals = (await readContract({
      ...info,
      functionName: 'decimals',
    })) as bigint

    const allowance = (await readContract({
      ...info,
      functionName: 'allowance',
      args: [
        accountAddress.toLocaleLowerCase(),
        chainInfo!.registarContractAddress,
      ],
    })) as bigint

    const amount =
      (parseUnits(`${price}`, Number(decimals)) * BigInt(duration)) /
      BigInt(YEAR_DURATION_IN_SECONDS)

    if (allowance < amount) {
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
  amount: bigint,
  walletClient: GetWalletClientResult | undefined
): Promise<void> => {
  const chainInfo = getChainInfo(chain)

  try {
    await validateChainToActOn(chain, walletClient)
  } catch (e) {
    throw Error('Please connect to the correct network')
  }

  const tokenInfo = chainInfo!.acceptableTokens.find(
    _token => _token.token === token
  )
  if (!tokenInfo) {
    throw Error('Token not accepted')
  }

  const info = {
    address: tokenInfo.contractAddress as `0x${string}`,
    chainId: chainInfo!.id,
    abi: ERC20,
  }

  const config = await prepareWriteContract({
    ...info,
    functionName: 'approve',
    args: [chainInfo!.registarContractAddress, amount],
  })

  const { hash } = await writeContract(config)
  await waitForTransaction({
    hash,
  })
}

export const getNativePriceForDuration = async (
  plan: Plan,
  duration: number,
  chain: SupportedChain
): Promise<bigint> => {
  const chainInfo = getChainInfo(chain)
  const planInfo = getPlanInfo(plan)
  if (planInfo) {
    const info = {
      address: chainInfo!.registarContractAddress as `0x${string}`,
      chainId: chainInfo!.id,
      abi: MWWRegister,
    }

    const result = (await readContract({
      ...info,
      functionName: 'getNativeConvertedValue',
      args: [planInfo.usdPrice],
    })) as any
    const value =
      (result[0] * BigInt(duration)) / BigInt(YEAR_DURATION_IN_SECONDS)

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
  token: AcceptedToken,
  walletClient?: GetWalletClientResult
): Promise<TransactionReceipt> => {
  try {
    const subExists = await getSubscriptionByDomain(domain)
    if (subExists && subExists!.owner_account !== accountAddress) {
      throw Error('Domain already registered')
    }
  } catch (e: any) {
    if (e.status !== 404) {
      throw e
    }
  }

  const chainInfo = getChainInfo(chain)

  try {
    await validateChainToActOn(chain, walletClient)
  } catch (e) {
    throw Error('Please connect to the correct network')
  }

  const info = {
    address: chainInfo!.registarContractAddress as `0x${string}`,
    chainId: chainInfo!.id,
    abi: MWWRegister,
  }

  try {
    const tokenInfo = chainInfo!.acceptableTokens.find(
      _token => _token.token === token
    )

    if (tokenInfo?.contractAddress !== zeroAddress) {
      if (!tokenInfo) {
        throw Error('Token not accepted')
      }
      const neededApproval = await checkAllowance(
        accountAddress as `0x${string}`,
        plan,
        chain,
        token,
        duration,
        walletClient
      )

      if (neededApproval > 0) {
        const tokenConfig = await prepareWriteContract({
          address: tokenInfo.contractAddress as `0x${string}`,
          chainId: chainInfo!.id,
          abi: ERC20,
          functionName: 'approve',
          args: [chainInfo!.registarContractAddress, neededApproval],
        })

        const tokenResult = await writeContract(tokenConfig)
        await waitForTransaction({
          hash: tokenResult.hash,
        })
      }

      const config = await prepareWriteContract({
        ...info,
        functionName: 'purchaseWithToken',
        args: [
          tokenInfo.contractAddress,
          plan,
          accountAddress.toLocaleLowerCase(),
          duration,
          domain,
          '',
        ],
      })

      const result = await writeContract(config)
      return await waitForTransaction({
        hash: result.hash,
      })
    } else {
      const planInfo = getPlanInfo(plan)
      if (!planInfo) {
        throw Error('Plan does not exists')
      }

      const readResult = (await readContract({
        ...info,
        functionName: 'getNativeConvertedValue',
        args: [planInfo.usdPrice],
      })) as any
      const value =
        (readResult[0] * BigInt(duration)) / BigInt(YEAR_DURATION_IN_SECONDS)

      const config = await prepareWriteContract({
        ...info,
        functionName: 'purchaseWithNative',
        args: [plan, accountAddress.toLocaleLowerCase(), duration, domain, ''],
        value: BigInt(value),
      })

      const result = await writeContract(config)
      return await waitForTransaction({
        hash: result.hash,
      })
    }
  } catch (error) {
    // TODO handle insufficient funds error
    throw error
  }
}

export const confirmSubscription = async (
  result: WriteContractResult,
  domain: string
): Promise<Subscription | undefined> => {
  await waitForTransaction({
    hash: result.hash,
  })
  const subscriptions = await syncSubscriptions()
  return subscriptions.find(sub => sub.domain === domain)
}

export const convertBlockchainSubscriptionToSubscription = (
  sub: BlockchainSubscription
): Subscription => {
  let expiryTime = Number(sub.expiryTime)

  if (expiryTime.toString().length === 13) {
    //bad domain adding with expiry in milliseconds and not seconds
    expiryTime = expiryTime / 1000
  }

  const subscriptionInfo: Subscription = {
    plan_id: Number(sub.planId),
    chain: sub.chain,
    owner_account: sub.owner.toLowerCase(),
    expiry_time:
      new Date(expiryTime * 1000).getFullYear() < 2200
        ? new Date(expiryTime * 1000)
        : new Date(2200, 1, 1), // bad initial domain injections
    domain: sub.domain,
    config_ipfs_hash: sub.configIpfsHash,
    registered_at: new Date(Number(sub.registeredAt) * 1000),
  }

  return subscriptionInfo
}

export const changeDomainOnChain = async (
  accountAddress: string,
  domain: string,
  newDomain: string,
  walletClient?: GetWalletClientResult
): Promise<TransactionReceipt> => {
  try {
    const subExists = await getSubscriptionByDomain(newDomain)
    if (subExists) {
      throw Error('Domain already registered')
    }
  } catch (e: any) {
    if (e.status !== 404) {
      throw e
    }
  }

  let chain: any
  try {
    const subExists = await getSubscriptionByDomain(domain)
    if (subExists && subExists!.owner_account !== accountAddress) {
      throw Error('You can not change a domain you do not own')
    } else {
      chain = subExists!.chain
    }
  } catch (e: any) {
    throw Error('Your current domain is not registered. Please contact us')
  }

  const chainInfo = getChainInfo(chain!)

  try {
    await validateChainToActOn(chain!, walletClient)
  } catch (e) {
    throw Error(
      'Please connect to the ${chain} network. (consider you must unlock your wallet and also reload the page after that)'
    )
  }

  const info = {
    address: chainInfo!.domainContractAddess as `0x${string}`,
    chainId: chainInfo!.id,
    abi: MWWDomain,
  }

  try {
    const config = await prepareWriteContract({
      ...info,
      functionName: 'changeDomain',
      args: [domain, newDomain],
    })

    const result = await writeContract(config)
    return await waitForTransaction({
      hash: result.hash,
    })
  } catch (error: any) {
    Sentry.captureException(error)
    throw Error(checkTransactionError(error))
  }
}
