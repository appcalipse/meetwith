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
export enum PlanType {
  ONE_OFF = 'one_off',
  SESSIONS = 'sessions',
}
export enum PaymentChannel {
  ACCOUNT_ADDRESS = 'account_address',
  CUSTOM_ADDRESS = 'custom_address',
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
