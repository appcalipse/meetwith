import { ethers } from 'ethers'

export interface ChainInfo {
  chain: SupportedChain
  id: number
  name: string
  fullName: string
  rpcUrl: string
  testnet: boolean
  nativeTokenSymbol: string
  domainContractAddess: string
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
    domainContractAddess: '0x87cEbF6684488998bd48C07E0691D31b64D30e2A',
    registarContractAddress: '0xDD853a88ACbD365085D17448a97DD6123fE91b4A',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
    acceptableTokens: [
      {
        token: AcceptedToken.MATIC,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x9Cb38ff196107750Fe05FDE9a5c449319DD9f848',
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
    domainContractAddess: '0xa1C624685b0B5AF16be093bbc00ad525Be3f046B',
    registarContractAddress: '0xC1A78C9ce8FC447030eDff6728822cfd6fFc1948',
    blockExplorerUrl: 'https://explorer.pops.one',
    acceptableTokens: [
      {
        token: AcceptedToken.ONE,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x0C1d5a01ab6a8D3CAe7C03feF6cAF513E5A98E00',
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
    domainContractAddess: '0xECfd0052945e235a1E4aE78C02F05F802282cb74',
    registarContractAddress: '0x13B5065B2586f0D457641b4C4FA09C2550843F42',
    blockExplorerUrl: 'https://stardust-explorer.metis.io',
    acceptableTokens: [
      {
        token: AcceptedToken.METIS,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xFf8d4104D0bcE4ad3480326Ea8202514CBF09B6C',
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
