import { MeetingType } from '@/types/Account'
import { SupportedChain, supportedChains } from '@/types/chains'
import { isProduction } from '@/utils/constants'

export enum SessionType {
  PAID = 'paid',
  FREE = 'free',
}
export const isSessionType = (value: string): value is SessionType => {
  return Object.values(SessionType).some(type => type === value)
}

export const SessionTypeOptions = [
  {
    value: SessionType.PAID,
    label: 'Paid',
  },
  {
    value: SessionType.FREE,
    label: 'Free',
  },
]
export const MinNoticeTimeOptions = [
  {
    value: 'minutes',
    label: 'Minutes',
  },
  {
    value: 'hours',
    label: 'Hours',
  },
  {
    value: 'days',
    label: 'Days',
  },
]
export const DurationOptions = [
  {
    value: 15,
    label: '15 Mins',
  },
  {
    value: 30,
    label: '30 Mins',
  },
  {
    value: 30,
    label: '45 Mins',
  },
  {
    value: 60,
    label: '60 Mins',
  },
]
export enum PlanType {
  ONE_OFF = 'one_off',
  SESSIONS = 'sessions',
}
export const PlanTypeOptions = [
  {
    value: PlanType.ONE_OFF,
    label: 'One-off',
  },
  {
    value: PlanType.SESSIONS,
    label: 'Package of Sessions',
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
    value: PaymentChannel.ACCOUNT_ADDRESS,
    label: `In-app wallet (${address})`,
  },
  {
    value: PaymentChannel.CUSTOM_ADDRESS,
    label: 'Custom Address',
  },
]
const devChains = [
  SupportedChain.SEPOLIA,
  SupportedChain.ARBITRUM_SEPOLIA,
  // SupportedChain.CELO_ALFAJORES,
]
const prodChains = [
  SupportedChain.ARBITRUM, //SupportedChain.CELO
]
export const supportedPaymentChains = isProduction ? prodChains : devChains

export const CryptoNetworkForCardSettlementOptions = supportedChains
  .filter(val => (supportedPaymentChains || []).includes(val.chain))
  .map(val => ({
    value: val.id,
    label: val.fullName,
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
}
export const getDefaultValues = (): Partial<MeetingType> => ({
  type: SessionType.FREE,
  slug: '',
  title: '',
  duration_minutes: 30,
  min_notice_minutes: 60,
  calendars: [],
  availabilities: [],
  description: '',
  plan: {
    type: PlanType.ONE_OFF,
    no_of_slot: 1,
    price_per_slot: 0,
    payment_channel: PaymentChannel.ACCOUNT_ADDRESS,
    payment_address: '',
    meeting_type_id: '',
    default_chain_id: supportedChains[0].id,
    created_at: new Date(),
    updated_at: new Date(),
    id: '',
  },
})

export enum Currency {
  USD = 'USD',
}

export const networkOptions = supportedChains
  .filter(val => (supportedPaymentChains || []).includes(val.chain))
  .map(val => ({
    id: val.id,
    name: val.fullName,
    icon: val.image,
    value: val.chain,
  }))
