import { ethers } from 'ethers'

export interface ChainInfo {
  chain: SupportedChain
  id: number
  name: string
  fullName: string
  rpcUrl: string
  testnet: boolean
  nativeTokenSymbol: string
  subscriptionContractAddess: string
  registarContractAddress: string
  acceptableTokens: AcceptedTokenInfo[]
  blockExplorerUrl: string
}

export enum SupportedChain {
  POLYGON_MATIC = 'POLYGON_MATIC',
  POLYGON_MUMBAI = 'POLYGON_MUMBAI',
  HARMONY = 'HARMONY',
  HARMONY_TESTNET = 'HARMONY_TESTNET',
  METIS_ANDROMEDA = 'METIS_ANDROMEDA',
  METIS_STARTDUST = 'METIS_STARTDUST',
}

export enum AcceptedToken {
  ETHER = 'ETHER',
  MATIC = 'MATIC',
  METIS = 'METIS',
  ONE = 'ONE',
  DAI = 'DAI',
  USDC = 'USDC',
}

export interface AcceptedTokenInfo {
  token: AcceptedToken
  contractAddress: string
}

export const supportedChains: ChainInfo[] = [
  {
    chain: SupportedChain.POLYGON_MUMBAI,
    id: 80001,
    name: 'Mumbai',
    fullName: 'Mumbai',
    rpcUrl: 'https://matic-mumbai.chainstacklabs.com',
    testnet: true,
    nativeTokenSymbol: 'MATIC',
    subscriptionContractAddess: '0x25D64EA72Cd90eDE499639E32040e10e70B0d45d',
    registarContractAddress: '0x98FAb7cD7d3095b65B54115697CA998012bea037',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
    acceptableTokens: [
      {
        token: AcceptedToken.MATIC,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xcb7f6C752e00da963038f1BaE79aafBCa8473a36',
      },
    ],
  },
  {
    chain: SupportedChain.HARMONY_TESTNET,
    id: 1666700000,
    name: 'Harmony Testnet',
    fullName: 'Harmony Testnet Shard 0',
    rpcUrl: 'https://api.s0.b.hmny.io',
    testnet: true,
    nativeTokenSymbol: 'ONE',
    subscriptionContractAddess: '0x0B63ea2262CD64fE3A032Fc220b5352Ff98c7EA3',
    registarContractAddress: '0xC120601404c894a89CF0D08D52e3E1fc7943bA1c',
    blockExplorerUrl: 'https://explorer.pops.one',
    acceptableTokens: [
      {
        token: AcceptedToken.ONE,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xECfd0052945e235a1E4aE78C02F05F802282cb74',
      },
    ],
  },

  {
    chain: SupportedChain.METIS_STARTDUST,
    id: 588,
    name: 'Metis Stardust',
    fullName: 'Metis Stardust Testnet',
    rpcUrl: 'https://stardust.metis.io/?owner=588',
    testnet: true,
    nativeTokenSymbol: 'METIS',
    subscriptionContractAddess: '0xd05d8e0Bf27951b649914A00EF9C9E8bEE8766b8',
    registarContractAddress: '0xF134578d326479FD3aA7c9f861AA8F84FD1f4A82',
    blockExplorerUrl: 'https://stardust-explorer.metis.io',
    acceptableTokens: [
      {
        token: AcceptedToken.METIS,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xD3F1eE2b69ffCF8AcD20ef79Fd6697Ceb99Ae024',
      },
    ],
  },
]

export const getTestnetChains = (): ChainInfo[] => {
  return supportedChains.filter(chain => chain.testnet)
}

export const getMainnetChains = (): ChainInfo[] => {
  return supportedChains.filter(chain => !chain.testnet)
}

export const getChainInfo = (chain: SupportedChain): ChainInfo | undefined => {
  return supportedChains.find(c => c.chain === chain)
}
