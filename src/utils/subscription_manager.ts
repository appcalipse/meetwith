import * as Sentry from '@sentry/nextjs'
import { erc20Abi } from 'abitype/abis'
import { Abi } from 'abitype/zod'
import {
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { TransactionReceipt } from 'thirdweb/dist/types/transaction/types'
import { Wallet } from 'thirdweb/wallets'
import { Address } from 'viem'

import { MWWDomain, MWWRegister } from '../abis/mww'
import { Account } from '../types/Account'
import { AcceptedToken, getChainInfo, SupportedChain } from '../types/chains'
import {
  BlockchainSubscription,
  getPlanInfo,
  Plan,
  Subscription,
} from '../types/Subscription'
import {
  getActiveSubscription,
  getSubscriptionByDomain,
  syncSubscriptions,
} from './api_helper'
import { YEAR_DURATION_IN_SECONDS } from './constants'
import { ApiFetchError } from './errors'
import { parseUnits, zeroAddress } from './generic_utils'
import { checkTransactionError, validateChainToActOn } from './rpc_helper_front'
import { thirdWebClient } from './user_manager'

export const isProAccount = (
  account?: Pick<Account, 'subscriptions'> | null
): boolean => {
  // Check domain subscriptions
  const domainSubscription = getActiveProSubscription(account)
  if (domainSubscription) {
    return true
  }
  // This sync version only checks domain subscriptions for backward compatibility
  return false
}

export const getActiveProSubscription = (
  account?: Pick<Account, 'subscriptions'> | null
): Subscription | undefined => {
  return account?.subscriptions?.find(
    sub => new Date(sub.expiry_time) > new Date()
  )
}

// Get the most recent active billing subscription from account subscriptions
export const getActiveBillingSubscription = (
  account?: Pick<Account, 'subscriptions'> | null
): Subscription | null => {
  if (!account?.subscriptions) return null

  const now = new Date()
  const billingSubs = account.subscriptions
    .filter(sub => sub.billing_plan_id && new Date(sub.expiry_time) > now)
    .sort(
      (a, b) =>
        new Date(b.expiry_time).getTime() - new Date(a.expiry_time).getTime()
    )

  return billingSubs.length > 0 ? billingSubs[0] : null
}

// checks both domain and billing subscriptions
export const getActiveProSubscriptionAsync = async (
  accountAddress: string
): Promise<Subscription | null> => {
  try {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const billingSubscription = await getActiveSubscription(accountAddress)
    if (billingSubscription?.subscription) {
      const expiresAt = billingSubscription.expires_at
        ? new Date(billingSubscription.expires_at)
        : null

      if (expiresAt && expiresAt > threeDaysAgo) {
        return null
      }
    }

    // Fall back to domain subscriptions
    const subscriptions = await syncSubscriptions()
    const activeDomainSubscription = subscriptions.find(
      sub => new Date(sub.expiry_time) > threeDaysAgo
    )

    return activeDomainSubscription || null
  } catch (error) {
    Sentry.captureException(error)
    return null
  }
}

export const checkAllowance = async (
  accountAddress: `0x${string}`,
  plan: Plan,
  chain: SupportedChain,
  token: AcceptedToken,
  duration: number,
  wallet: Wallet
): Promise<bigint> => {
  const price = getPlanInfo(plan)?.usdPrice
  if (price) {
    const chainInfo = getChainInfo(chain)

    try {
      await validateChainToActOn(chain, wallet)
    } catch (e) {
      console.error(e)
      throw Error('Please connect to the correct network')
    }

    const tokenInfo = chainInfo!.acceptableTokens.find(
      _token => _token.token === token
    )
    if (!tokenInfo) {
      throw Error('Token not accepted')
    }

    const contract = getContract({
      client: thirdWebClient,
      chain: chainInfo!.thirdwebChain,
      address: tokenInfo.contractAddress,
      abi: erc20Abi,
    })

    const decimals = await readContract({
      contract,
      method: 'decimals',
    })

    const allowance = await readContract({
      contract,
      method: 'allowance',
      params: [
        accountAddress.toLowerCase() as Address,
        chainInfo!.registarContractAddress as Address,
      ],
    })

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
  wallet: Wallet
): Promise<void> => {
  const chainInfo = getChainInfo(chain)

  try {
    await validateChainToActOn(chain, wallet)
  } catch (e) {
    throw Error('Please connect to the correct network')
  }

  const tokenInfo = chainInfo!.acceptableTokens.find(
    _token => _token.token === token
  )
  if (!tokenInfo) {
    throw Error('Token not accepted')
  }

  const contract = getContract({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    address: tokenInfo.contractAddress,
    abi: erc20Abi,
  })

  const tokenTransaction = await prepareContractCall({
    contract,
    method: 'approve',
    params: [chainInfo!.registarContractAddress as Address, amount],
  })

  const { transactionHash: tokenHash } = await sendTransaction({
    account: wallet.getAccount()!,
    transaction: tokenTransaction,
  })

  await waitForReceipt({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    transactionHash: tokenHash,
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
    const contract = getContract({
      client: thirdWebClient,
      chain: chainInfo!.thirdwebChain,
      address: chainInfo!.registarContractAddress,
      abi: Abi.parse(MWWRegister),
    })

    const result = await readContract({
      contract,
      method: 'function getNativeConvertedValue(uint8 price)',
      params: [planInfo.usdPrice],
    })
    const value =
      (BigInt(result[0]) * BigInt(duration)) / BigInt(YEAR_DURATION_IN_SECONDS)

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
  wallet: Wallet
): Promise<TransactionReceipt> => {
  try {
    const subExists = await getSubscriptionByDomain(domain)
    if (subExists && subExists!.owner_account !== accountAddress) {
      throw Error('Domain already registered')
    }
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status !== 404) {
      throw e
    }
  }

  const chainInfo = getChainInfo(chain)

  try {
    await validateChainToActOn(chain, wallet)
  } catch (e) {
    throw Error('Please connect to the correct network')
  }

  const contract = getContract({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    address: chainInfo!.registarContractAddress,
    abi: Abi.parse(MWWRegister),
  })

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
        wallet
      )

      if (neededApproval > 0) {
        const tokenContract = getContract({
          client: thirdWebClient,
          chain: chainInfo!.thirdwebChain,
          address: tokenInfo.contractAddress,
          abi: erc20Abi,
        })

        const tokenTransaction = await prepareContractCall({
          contract: tokenContract,
          method: 'approve',
          params: [
            chainInfo!.registarContractAddress as Address,
            neededApproval,
          ],
        })

        const { transactionHash: tokenHash } = await sendTransaction({
          account: wallet.getAccount()!,
          transaction: tokenTransaction,
        })

        await waitForReceipt({
          client: thirdWebClient,
          chain: chainInfo!.thirdwebChain,
          transactionHash: tokenHash,
        })
      }

      const transaction = prepareContractCall({
        contract,
        method:
          'function purchaseWithToken(address tokenAddress, uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash)',
        params: [
          tokenInfo.contractAddress as Address,
          plan,
          accountAddress.toLocaleLowerCase() as Address,
          BigInt(duration),
          domain,
          '',
        ],
      })

      const { transactionHash } = await sendTransaction({
        account: wallet.getAccount()!,
        transaction,
      })

      return await waitForReceipt({
        client: thirdWebClient,
        chain: chainInfo!.thirdwebChain,
        transactionHash,
      })
    } else {
      const planInfo = getPlanInfo(plan)
      if (!planInfo) {
        throw Error('Plan does not exists')
      }

      const readResult = await readContract({
        contract,
        method:
          'function getNativeConvertedValue(uint256 usdPrice) public view returns (uint256 amountInNative, uint256 timestamp)',
        params: [BigInt(planInfo.usdPrice)],
      })

      const value =
        (BigInt(readResult[0]) * BigInt(duration)) /
        BigInt(YEAR_DURATION_IN_SECONDS)

      const transaction = await prepareContractCall({
        contract,
        method:
          'function purchaseWithNative(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash)',
        params: [
          plan,
          accountAddress.toLocaleLowerCase() as Address,
          BigInt(duration),
          domain,
          '',
        ],
        value: BigInt(value),
      })

      const { transactionHash } = await sendTransaction({
        account: wallet.getAccount()!,
        transaction,
      })

      return await waitForReceipt({
        client: thirdWebClient,
        chain: chainInfo!.thirdwebChain,
        transactionHash,
      })
    }
  } catch (error) {
    // TODO handle insufficient funds error
    throw error
  }
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
  wallet: Wallet
): Promise<TransactionReceipt> => {
  try {
    const subExists = await getSubscriptionByDomain(newDomain)
    if (subExists) {
      throw Error('Domain already registered')
    }
  } catch (e: unknown) {
    if (e instanceof ApiFetchError && e.status !== 404) {
      throw e
    }
  }

  let chain: SupportedChain | null = null
  try {
    const subExists = await getSubscriptionByDomain(domain)
    if (subExists && subExists!.owner_account !== accountAddress) {
      throw Error('You can not change a domain you do not own')
    } else {
      chain = subExists!.chain
    }
  } catch (_e: unknown) {
    throw Error('Your current domain is not registered. Please contact us')
  }

  const chainInfo = getChainInfo(chain!)

  try {
    await validateChainToActOn(chain!, wallet)
  } catch (_e) {
    throw Error(
      'Please connect to the ${chain} network. (consider you must unlock your wallet and also reload the page after that)'
    )
  }

  const contract = getContract({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    address: chainInfo!.domainContractAddess,
    abi: Abi.parse(MWWDomain),
  })

  try {
    const transaction = await prepareContractCall({
      contract,
      method: 'function changeDomain(string old, string new)',
      params: [domain, newDomain],
    })

    const { transactionHash } = await sendTransaction({
      account: wallet.getAccount()!,
      transaction,
    })

    return await waitForReceipt({
      client: thirdWebClient,
      chain: chainInfo!.thirdwebChain,
      transactionHash,
    })
  } catch (error: unknown) {
    Sentry.captureException(error)
    throw Error(checkTransactionError(error))
  }
}
