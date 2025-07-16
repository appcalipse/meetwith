import {
  arbitrum,
  arbitrumSepolia,
  celo,
  celoAlfajoresTestnet,
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
  ARBITRUM = 'ARBITRUM',
  ARBITRUM_SEPOLIA = 'ARBITRUM_SEPOLIA',
  CELO_ALFAJORES = 'CELO_ALFAJORES',
  CELO = 'CELO',
  CUSTOM = 'CUSTOM',
}

export enum AcceptedToken {
  ETHER = 'ETHER',
  MATIC = 'MATIC',
  METIS = 'METIS',
  DAI = 'DAI',
  USDC = 'USDC',
  EUR = 'EUR',
  CELO = 'CELO',
  CUSD = 'CUSD',
  CEUR = 'CEUR',
}

export interface AcceptedTokenInfo {
  token: AcceptedToken
  contractAddress: string
}
export const getTokenIcon = (token: AcceptedToken) => {
  switch (token) {
    case AcceptedToken.DAI:
      return '/assets/chains/DAI.svg'
    case AcceptedToken.USDC:
      return '/assets/tokens/USDC.svg'
    case AcceptedToken.CUSD:
      return '/assets/tokens/CUSD.png'
    case AcceptedToken.METIS:
      return '/assets/chains/Metis.svg'
    case AcceptedToken.MATIC:
      return '/assets/chains/Polygon.svg'
    case AcceptedToken.ETHER:
      return '/assets/chains/ethereum.svg'
    default:
      return
  }
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
      {
        token: AcceptedToken.USDC,
        contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
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
  {
    chain: SupportedChain.CELO,
    thirdwebChain: celo,
    id: 42220,
    name: 'Celo',
    fullName: 'Celo Mainnet',
    rpcUrl: 'https://forno.celo.org',
    testnet: false,
    nativeTokenSymbol: 'CELO',
    domainContractAddess: '0x000000000000000000000000000000000000ce10',
    registarContractAddress: '', // no applicable registar contract on Celo
    blockExplorerUrl: 'https://explorer.celo.org',
    image: '/assets/chains/Celo.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.CELO,
        contractAddress: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      },
      {
        token: AcceptedToken.CUSD,
        contractAddress: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD
      },
      {
        token: AcceptedToken.CEUR, // cEUR
        contractAddress: '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73',
      },
    ],
  },
  {
    chain: SupportedChain.CELO_ALFAJORES,
    thirdwebChain: celoAlfajoresTestnet,
    id: 44787,
    name: 'Celo Alfajores',
    fullName: 'Celo Alfajores Testnet',
    rpcUrl: 'https://alfajores.celoscan.io',
    testnet: true,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x0000000000000000000000000000000000000000', // N/A
    registarContractAddress: '0x0000000000000000000000000000000000000000', // N/A
    blockExplorerUrl: 'https://alfajores.celoscan.io',
    image: '/assets/chains/Celo.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.CELO,
        contractAddress: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
      },
      {
        token: AcceptedToken.CUSD,
        contractAddress: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9', // Arbitrum-native USDC :contentReference[oaicite:1]{index=1}
      },
    ],
  },
  {
    chain: SupportedChain.ARBITRUM,
    thirdwebChain: arbitrum,
    id: 42161,
    name: 'Arbitrum',
    fullName: 'Arbitrum One Mainnet',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    testnet: false,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x0000000000000000000000000000000000000000', // N/A
    registarContractAddress: '0x0000000000000000000000000000000000000000', // N/A
    blockExplorerUrl: 'https://arbiscan.io',
    image: '/assets/chains/Arbitrum.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.ETHER,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.USDC,
        contractAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum-native USDC :contentReference[oaicite:1]{index=1}
      },
    ],
  },
  {
    chain: SupportedChain.ARBITRUM_SEPOLIA,
    thirdwebChain: arbitrumSepolia,
    id: 421614,
    name: 'Arbitrum',
    fullName: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia.arbiscan.io/rpc',
    testnet: true,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x0000000000000000000000000000000000000000', // N/A
    registarContractAddress: '0x0000000000000000000000000000000000000000', // N/A
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    image: '/assets/chains/Arbitrum.svg',
    acceptableTokens: [
      {
        token: AcceptedToken.ETHER,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.USDC,
        contractAddress: '0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d', // Arbitrum-native USDC :contentReference[oaicite:1]{index=1}
      },
    ],
  },
]
export const DEFAULT_CHAIN_ID = 42220

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
export const getChainImage = (chain: SupportedChain) => {
  return supportedChains.find(val => val.chain === chain)?.image
}
