import { MeetingType } from '@/types/Account'
import { AcceptedToken, SupportedChain, supportedChains } from '@/types/chains'
import { MeetingProvider } from '@/types/Meeting'
import { isProduction } from '@/utils/constants'
import { zeroAddress } from '@/utils/generic_utils'

export enum SessionType {
  PAID = 'paid',
  FREE = 'free',
}
export const NO_MEETING_TYPE = 'no_type'
export const isSessionType = (value: string): value is SessionType => {
  return Object.values(SessionType).some(type => type === value)
}

export const SessionTypeOptions = [
  {
    label: 'Free',
    value: SessionType.FREE,
  },
  {
    label: 'Paid',
    value: SessionType.PAID,
  },
]
export const BASE_PROVIDERS = [
  MeetingProvider.GOOGLE_MEET,
  MeetingProvider.ZOOM,
  MeetingProvider.HUDDLE,
  MeetingProvider.JITSI_MEET,
]
export const MinNoticeTimeOptions = [
  {
    label: 'Minutes',
    value: 'minutes',
  },
  {
    label: 'Hours',
    value: 'hours',
  },
  {
    label: 'Days',
    value: 'days',
  },
]
export const DurationOptions = [
  {
    label: '15 Mins',
    value: 15,
  },
  {
    label: '30 Mins',
    value: 30,
  },
  {
    label: '45 Mins',
    value: 45,
  },
  {
    label: '60 Mins',
    value: 60,
  },
]

export enum PlanType {
  ONE_OFF = 'one_off',
  SESSIONS = 'sessions',
}

export const PlanTypeOptions = [
  {
    label: 'One-off',
    value: PlanType.ONE_OFF,
  },
  {
    label: 'Package of Sessions',
    value: PlanType.SESSIONS,
  },
]
export const isPlanType = (value: string): value is PlanType => {
  return Object.values(PlanType).some(type => type === value)
}

export enum PaymentChannel {
  ACCOUNT_ADDRESS = 'account_address',
  CUSTOM_ADDRESS = 'custom_address',
}

export const PaymentChannelOptions = (address: string) => [
  {
    label: `In-app wallet (${address})`,
    value: PaymentChannel.ACCOUNT_ADDRESS,
  },
  {
    label: 'Custom Address',
    value: PaymentChannel.CUSTOM_ADDRESS,
  },
]
const devChains = [
  SupportedChain.SEPOLIA,
  SupportedChain.ARBITRUM_SEPOLIA,
  SupportedChain.ARBITRUM,
  SupportedChain.CELO,
  // SupportedChain.CELO_ALFAJORES,
]
const prodChains = [SupportedChain.ARBITRUM, SupportedChain.CELO]
export const supportedPaymentChains = isProduction ? prodChains : devChains

export const CryptoNetworkForCardSettlementOptions = supportedChains
  .filter(val => (supportedPaymentChains || []).includes(val.chain))
  .map(val => ({
    label: val.fullName,
    value: val.id,
  }))
export const isPaymentChannel = (value: string): value is PaymentChannel => {
  return Object.values(PaymentChannel).some(channel => channel === value)
}

export enum PaymentType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
}

export enum PaymentDirection {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum TokenType {
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
  NATIVE = 'native',
  NFT = 'nft',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PublicSchedulingSteps {
  SELECT_TYPE = 'select-type',
  PAY_FOR_SESSION = 'pay-for-session',
  BOOK_SESSION = 'book-session',
}

export enum PaymentStep {
  SELECT_PAYMENT_METHOD = 'select-payment-method',
  CONFIRM_PAYMENT = 'confirm-payment',
  FIAT_PAYMENT_VERIFYING = 'fiat-payment-verifying',
  SELECT_CRYPTO_NETWORK = 'select-crypto-network',
  HANDLE_SEND_INVOICE = 'handle-send-invoice',
}
export enum PaymentRedirectType {
  INVOICE = 'direct-invoice',
  CHECKOUT = 'checkout',
}
export const getDefaultValues = (): Partial<MeetingType> => ({
  availabilities: [],
  calendars: [],
  description: '',
  duration_minutes: 30,
  min_notice_minutes: 60,
  plan: {
    created_at: new Date(),
    default_chain_id: networkOptions[0].id,
    default_token: AcceptedToken.USDC,
    id: '',
    meeting_type_id: '',
    no_of_slot: 1,
    payment_address: '',
    payment_channel: PaymentChannel.ACCOUNT_ADDRESS,
    payment_methods: [],
    price_per_slot: 0,
    type: PlanType.ONE_OFF,
    updated_at: new Date(),
  },
  slug: '',
  title: '',
  type: SessionType.FREE,
})

export const networkOptions = supportedChains
  .filter(
    val =>
      val.walletSupported &&
      (supportedPaymentChains || []).includes(val.chain) &&
      val.acceptableTokens.some(
        token => token.walletSupported && token.contractAddress !== zeroAddress
      )
  )
  .map(val => ({
    icon: val.image,
    id: val.id,
    name: val.fullName,
    value: val.chain,
  }))
