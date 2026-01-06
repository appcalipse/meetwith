/* eslint-disable no-restricted-syntax */

import { captureException } from '@sentry/nextjs'
import { createCryptoTransaction } from '@utils/database'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Bridge } from 'thirdweb'
import { WebhookPayload } from 'thirdweb/dist/types/bridge'
import { formatUnits } from 'viem'

import { getSupportedChainFromId } from '@/types/chains'
import { ConfirmCryptoTransactionRequest } from '@/types/Requests'
import { Address, IPurchaseData, ISubscriptionData } from '@/types/Transactions'
import { PaymentType, TokenType } from '@/utils/constants/meeting-types'
import { ChainNotFound } from '@/utils/errors'
import {
  DEFAULT_MESSAGE_NAME,
  DEFAULT_SUBSCRIPTION_MESSAGE_NAME,
  PubSubManager,
} from '@/utils/pub-sub.helper'
import { handleCryptoSubscriptionPayment } from '@/utils/services/crypto.helper'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const pubSubManager = new PubSubManager()
      // Convert headers to Record<string, string> format
      const headerRecord: Record<string, string> = {}
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headerRecord[key] = value
        } else if (Array.isArray(value)) {
          headerRecord[key] = value[0] // Take first value if array
        }
      }
      console.log(
        process.env.THIRDWEB_WEBHOOK_SECRET,
        JSON.stringify(req.body),
        headerRecord
      )
      const payload: WebhookPayload = await Bridge.Webhook.parse(
        JSON.stringify(req.body),
        headerRecord,
        process.env.THIRDWEB_WEBHOOK_SECRET!
      )
      console.log(payload)
      if (
        ['pay.onramp-transaction', 'pay.onchain-transaction'].includes(
          payload.type
        )
      ) {
        const chainId =
          payload.type === 'pay.onramp-transaction'
            ? payload.data?.token?.chainId
            : payload.data?.destinationToken?.chainId
        const supportedChain = getSupportedChainFromId(
          payload.type === 'pay.onramp-transaction'
            ? payload.data?.token?.chainId
            : payload.data?.destinationToken?.chainId
        )
        if (!supportedChain) {
          throw new ChainNotFound(chainId.toString())
        }

        const purchaseData = payload.data.purchaseData as
          | IPurchaseData
          | ISubscriptionData

        if (payload.data.status === 'COMPLETED') {
          // Check if this is a subscription payment
          const isSubscriptionPayment = 'subscription_channel' in purchaseData

          if (isSubscriptionPayment) {
            // Handle subscription payment
            try {
              const subscriptionData = purchaseData as ISubscriptionData
              const result = await handleCryptoSubscriptionPayment(
                payload,
                subscriptionData
              )

              // Publish transaction to subscription channel for frontend
              const pubSubManager = new PubSubManager()
              await pubSubManager.publishMessage(
                subscriptionData.subscription_channel,
                DEFAULT_SUBSCRIPTION_MESSAGE_NAME,
                JSON.stringify(result.transaction)
              )

              // Subscription payment handled successfully
              return res.status(200).send('OK')
            } catch (error) {
              captureException(error, {
                extra: {
                  subscriptionData: purchaseData,
                  payloadType: payload.type,
                },
              })
              console.error(
                'Failed to handle crypto subscription payment:',
                error
              )
              return res
                .status(500)
                .send('Failed to process subscription payment')
            }
          }

          // Continue with existing meeting payment flow
          const {
            guest_email,
            guest_name,
            message_channel,
            guest_address,
            meeting_type_id,
            environment,
          } = payload.data.purchaseData as IPurchaseData
          if (environment !== process.env.NEXT_PUBLIC_ENV_CONFIG) {
            return res.status(200).send('OK')
          }
          let transactionHash =
            payload.type === 'pay.onramp-transaction'
              ? payload.data.transactionHash
              : payload.data.transactions
                  .filter(val => val.chainId === chainId)
                  .at(-1)?.transactionHash

          if (!transactionHash && payload.type === 'pay.onchain-transaction') {
            transactionHash = payload.data.transactions.at(-1)?.transactionHash
          }

          const amount =
            payload.type === 'pay.onramp-transaction'
              ? payload.data.amount
              : payload?.data?.destinationAmount
          const decimals =
            payload.type === 'pay.onramp-transaction'
              ? payload.data.token.decimals
              : payload.data.destinationToken.decimals
          const parsedAmount = parseFloat(formatUnits(amount, decimals))
          const fiat_equivalent =
            payload.type === 'pay.onramp-transaction'
              ? payload.data.currencyAmount
              : payload.data.destinationToken?.priceUsd * parsedAmount
          const token_address =
            payload.type === 'pay.onramp-transaction'
              ? payload.data.token.address
              : payload.data.destinationToken.address
          const provider_reference_id =
            payload.type === 'pay.onramp-transaction'
              ? payload.data.id
              : /*cast type as this is not added on the package yet*/
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                payload.data?.transactionId || payload.data?.paymentId

          let fee_breakdown
          let total_fee
          let metadata
          if (payload.type === 'pay.onchain-transaction') {
            fee_breakdown = {
              network:
                payload.data.originToken?.priceUsd *
                  parseFloat(
                    formatUnits(
                      payload.data?.originAmount,
                      payload.data?.originToken.decimals
                    )
                  ) -
                fiat_equivalent,
              developer:
                (fiat_equivalent * payload?.data?.developerFeeBps) / 100 ** 2,
            }
            total_fee = Object.values(fee_breakdown).reduce(
              (acc, fee) => acc + fee,
              0
            )
            const filteredTransactions = payload.data.transactions.filter(
              val => val.transactionHash === transactionHash
            )
            if (filteredTransactions.length > 0) {
              metadata = {
                peerTransactions: filteredTransactions,
              }
            }
          }
          const transactionRequest: ConfirmCryptoTransactionRequest = {
            transaction_hash: transactionHash as Address,
            amount: parsedAmount,
            chain: supportedChain?.chain,
            fiat_equivalent,
            meeting_type_id: meeting_type_id ?? null,
            payment_method: PaymentType.CRYPTO,
            token_address,
            token_type: TokenType.ERC20,
            guest_email,
            guest_address,
            guest_name,
            provider_reference_id,
            fee_breakdown,
            total_fee,
            metadata,
          }
          // Log so we can track in case of misses
          // eslint-disable-next-line no-restricted-syntax
          console.log(transactionRequest)
          const transaction = await createCryptoTransaction(
            transactionRequest,
            guest_address
          )
          console.log(transaction)

          await pubSubManager.publishMessage(
            message_channel,
            DEFAULT_MESSAGE_NAME,
            JSON.stringify(transaction)
          )
        }
      }
      res.status(200).send('OK')
    } catch (error) {
      captureException(error, {
        extra: req.body,
      })
      console.error(error)
      res.status(400).send('Bad Request')
    }
  }
  return res.status(404).send('Not found')
}
