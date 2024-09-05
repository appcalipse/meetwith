import {
  Chain,
  defineChain,
  mainnet,
  polygon,
  polygonAmoy,
  sepolia,
} from 'thirdweb/chains'
import { metis } from 'viem/chains'

import { zeroAddress } from '@/utils/generic_utils'

export interface ChainInfo {
  chain: SupportedChain
  thirdwebChain: Chain
  id: number
  name: string
  fullName: string
  rpcUrl: string
  testnet: boolean
  nativeTokenSymbol: string
  domainContractAddess: string
  image: string
  registarContractAddress: string
  acceptableTokens: AcceptedTokenInfo[]
  blockExplorerUrl: string
}

export enum SupportedChain {
  ETHEREUM = 'ETHEREUM',
  POLYGON_MATIC = 'POLYGON_MATIC',
  POLYGON_AMOY = 'POLYGON_AMOI',
  SEPOLIA = 'SEPOLIA',
  METIS_ANDROMEDA = 'METIS_ANDROMEDA',
}

export enum AcceptedToken {
  ETHER = 'ETHER',
  MATIC = 'MATIC',
  METIS = 'METIS',
  DAI = 'DAI',
  USDC = 'USDC',
}

export interface AcceptedTokenInfo {
  token: AcceptedToken
  contractAddress: string
}

export interface TokenMeta {
  id: string
  symbol: string
  name: string
  web_slug: string
  asset_platform_id: string
  image: {
    thumb: string
    small: string
    large: string
  }
  contract_address: string
  last_updated: string
}

export const getNativeDecimals = (chain: SupportedChain): number => {
  // all supported tokens for now have 18 decimals
  return 18
}

export const supportedChains: ChainInfo[] = [
  {
    chain: SupportedChain.SEPOLIA,
    thirdwebChain: sepolia,
    id: 11155111,
    name: 'Sepolia',
    fullName: 'Ethereum Sepolia',
    rpcUrl: 'https://rpc2.sepolia.org',
    testnet: true,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x2809e5Cf4776640D0Da184605B0c82F803e97EFc',
    registarContractAddress: '0x2B1a67268BD808781bf5Eb761f1c43987dfa8E33',
    blockExplorerUrl: 'https://sepolia.etherscan.com',
    image: '/assets/chains/ethereum.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.ETHER,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x1DF8FcA6035342eeD37c3C10dcD4cC1B4030628D',
      },
    ],
  },
  {
    chain: SupportedChain.POLYGON_AMOY,
    thirdwebChain: polygonAmoy,
    id: 80002,
    name: 'Amoy',
    fullName: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
    testnet: true,
    nativeTokenSymbol: 'MATIC',
    domainContractAddess: '0x579846cFDe1d332b4Fd8E28Ce8cb880c81e9b302',
    registarContractAddress: '0x2Fa75727De367844b948172a94B5F752c2af8237',
    blockExplorerUrl: 'https://amoy.polygonscan.com/',
    image: '/assets/chains/Polygon.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.MATIC,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x9474C5069DaDc58A23dB7cFDD4fE29FF94764016',
      },
    ],
  },
  {
    chain: SupportedChain.ETHEREUM,
    thirdwebChain: mainnet,
    id: 1,
    name: 'Ethereum',
    fullName: 'Ethereum',
    rpcUrl: 'https://mainnet.infura.io/v3/e9561b79c40044eea932e764d03895df',
    testnet: false,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x444463a3892EA730e43e3B54E8e45005a9Fe1fbd',
    registarContractAddress: '0x7721a7C1472A565534A80511734Bc84fB27eb0a2',
    blockExplorerUrl: 'https://etherscan.com',
    image: '/assets/chains/ethereum.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.ETHER,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
      },
      {
        token: AcceptedToken.USDC,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
    ],
  },
  {
    chain: SupportedChain.POLYGON_MATIC,
    id: 137,
    thirdwebChain: polygon,
    name: 'Polygon',
    fullName: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    testnet: false,
    nativeTokenSymbol: 'MATIC',
    domainContractAddess: '0xB054ef071881a35a276dc434D95BF087a957736b',
    registarContractAddress: '0xf652014545758Bae52A019CAf671a29A6B117759',
    blockExplorerUrl: 'https://polygonscan.com',
    image: '/assets/chains/Polygon.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.MATIC,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      },
      {
        token: AcceptedToken.USDC,
        contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      },
    ],
  },
  {
    chain: SupportedChain.METIS_ANDROMEDA,
    thirdwebChain: defineChain(metis),
    id: 1088,
    name: 'Metis',
    fullName: 'Metis Andromeda Mainnet',
    rpcUrl: 'https://andromeda.metis.io/?owner=1088',
    testnet: false,
    nativeTokenSymbol: 'METIS',
    domainContractAddess: '0xECfd0052945e235a1E4aE78C02F05F802282cb74',
    registarContractAddress: '0x13B5065B2586f0D457641b4C4FA09C2550843F42',
    blockExplorerUrl: 'https://andromeda-explorer.metis.io',
    image: '/assets/chains/Metis.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.METIS,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.USDC,
        contractAddress: '0xea32a96608495e54156ae48931a7c20f0dcc1a21',
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

export const getSupportedChainFromId = (
  chainId: number
): ChainInfo | undefined => {
  return supportedChains.find(c => c.id === chainId)
}
