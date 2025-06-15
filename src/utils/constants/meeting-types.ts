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
    label: 'Sessions',
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
export const CryptoNetworkForCardSettlementOptions = [
  {
    value: 42220,
    label: 'Celo',
  },
  {
    value: 42161,
    label: 'Arbitrum',
  },
]
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
  STABLECOIN = 'stablecoin',
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
  SELECT_TYPE = 'SELECT_TYPE',
  PAY_FOR_SESSION = 'PAY_FOR_SESSION',
  BOOK_SESSION = 'BOOK_SESSION',
}
