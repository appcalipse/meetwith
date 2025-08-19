import { captureException } from '@sentry/nextjs'
import { createCryptoTransaction } from '@utils/database'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Bridge } from 'thirdweb'
import { WebhookPayload } from 'thirdweb/dist/types/bridge'
import { formatUnits } from 'viem'

import { getSupportedChainFromId } from '@/types/chains'
import { ConfirmCryptoTransactionRequest } from '@/types/Requests'
import { Address, IPurchaseData } from '@/types/Transactions'
import { PaymentType, TokenType } from '@/utils/constants/meeting-types'
import { ChainNotFound } from '@/utils/errors'
import { DEFAULT_MESSAGE_NAME, publishMessage } from '@/utils/pub-sub.helper'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      // Convert headers to Record<string, string> format
      const headerRecord: Record<string, string> = {}
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headerRecord[key] = value
        } else if (Array.isArray(value)) {
          headerRecord[key] = value[0] // Take first value if array
        }
      }

      const payload: WebhookPayload = await Bridge.Webhook.parse(
        req.body,
        headerRecord,
        process.env.THIRDWEB_WEBHOOK_SECRET!
      )
      if (payload.type === 'pay.onramp-transaction') {
        const supportedChain = getSupportedChainFromId(
          payload.data?.token?.chainId
        )
        if (!supportedChain) {
          throw new ChainNotFound(payload.data?.token?.chainId.toString())
        }

        const { meetingId, messageChannel, guestEmail, guestName } = payload
          .data.purchaseData as IPurchaseData
        if (payload.data.status === 'COMPLETED') {
          const transactionRequest: ConfirmCryptoTransactionRequest = {
            transaction_hash: payload.data.transactionHash as Address,
            amount: parseFloat(
              formatUnits(payload.data.amount, payload.data.token.decimals)
            ),
            chain: supportedChain?.chain,
            fiat_equivalent: payload.data.currencyAmount,
            meeting_type_id: meetingId,
            payment_method: PaymentType.FIAT,
            token_address: payload.data.token.address,
            token_type: TokenType.ERC20,
            guest_email: guestEmail,
            guest_name: guestName,
            provider_reference_id: payload.data.id,
          }
          const transaction = await createCryptoTransaction(transactionRequest)
          await publishMessage(
            messageChannel,
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
