import {
  arbitrum,
  arbitrumSepolia,
  Chain,
  celo,
  celoAlfajoresTestnet,
  defineChain,
  mainnet,
  polygon,
  polygonAmoy,
  sepolia,
} from 'thirdweb/chains'
import { metis } from 'viem/chains'

import { zeroAddress } from '@/utils/generic_utils'

import { Address } from './Transactions'

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
  registarContractAddress: string
  blockExplorerUrl: string
  image: string
  acceptableTokens: AcceptedTokenInfo[]
  walletSupported?: boolean
  isProduction?: boolean
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
  USDT = 'USDT',
  EUR = 'EUR',
  CELO = 'CELO',
  CUSD = 'CUSD',
  CEUR = 'CEUR',
}

export interface AcceptedTokenInfo {
  token: AcceptedToken
  contractAddress: string
  displayName?: string
  icon?: string
  walletSupported?: boolean // Flag for wallet support
}
export const getTokenIcon = (token: AcceptedToken) => {
  switch (token) {
    case AcceptedToken.DAI:
      return '/assets/chains/DAI.svg'
    case AcceptedToken.USDC:
      return '/assets/tokens/USDC.svg'
    case AcceptedToken.USDT:
      return '/assets/tokens/USDT.svg'
    case AcceptedToken.CUSD:
      return '/assets/tokens/CUSD.png'
    case AcceptedToken.CELO:
      return '/assets/chains/Celo.svg'
    case AcceptedToken.CEUR:
      return '/assets/chains/Celo.svg'
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

export const getTokenName = (token: AcceptedToken): string => {
  switch (token) {
    case AcceptedToken.ETHER:
      return 'Ether'
    case AcceptedToken.MATIC:
      return 'Polygon'
    case AcceptedToken.METIS:
      return 'Metis'
    case AcceptedToken.DAI:
      return 'Dai'
    case AcceptedToken.USDC:
      return 'USD Coin'
    case AcceptedToken.USDT:
      return 'Tether USD'
    case AcceptedToken.EUR:
      return 'Euro'
    case AcceptedToken.CELO:
      return 'Celo'
    case AcceptedToken.CUSD:
      return 'Celo Dollar'
    case AcceptedToken.CEUR:
      return 'Celo Euro'
    default:
      return 'Unknown Token'
  }
}

export const getTokenSymbol = (token: AcceptedToken): string => {
  switch (token) {
    case AcceptedToken.ETHER:
      return 'ETH'
    case AcceptedToken.MATIC:
      return 'MATIC'
    case AcceptedToken.METIS:
      return 'METIS'
    case AcceptedToken.DAI:
      return 'DAI'
    case AcceptedToken.USDC:
      return 'USDC'
    case AcceptedToken.USDT:
      return 'USDT'
    case AcceptedToken.EUR:
      return 'EUR'
    case AcceptedToken.CELO:
      return 'CELO'
    case AcceptedToken.CUSD:
      return 'cUSD'
    case AcceptedToken.CEUR:
      return 'cEUR'
    default:
      return 'UNKNOWN'
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

export const getNativeDecimals = (_chain: SupportedChain): number => {
  // all supported tokens for now have 18 decimals
  return 18
}

export const supportedChains: ChainInfo[] = [
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        token: AcceptedToken.ETHER,
      },
      {
        contractAddress: '0x1DF8FcA6035342eeD37c3C10dcD4cC1B4030628D',
        token: AcceptedToken.DAI,
      },
      {
        contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        token: AcceptedToken.USDC,
      },
    ],
    blockExplorerUrl: 'https://sepolia.etherscan.com',
    chain: SupportedChain.SEPOLIA,
    domainContractAddess: '0x2809e5Cf4776640D0Da184605B0c82F803e97EFc',
    fullName: 'Ethereum Sepolia',
    id: 11155111,
    image: '/assets/chains/ethereum.svg',
    isProduction: false,
    name: 'Sepolia',
    nativeTokenSymbol: 'ETH',
    registarContractAddress: '0x2B1a67268BD808781bf5Eb761f1c43987dfa8E33',
    rpcUrl: 'https://rpc2.sepolia.org',
    testnet: true,
    thirdwebChain: sepolia,
  },
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        token: AcceptedToken.MATIC,
      },
      {
        contractAddress: '0x9474C5069DaDc58A23dB7cFDD4fE29FF94764016',
        token: AcceptedToken.DAI,
      },
    ],
    blockExplorerUrl: 'https://amoy.polygonscan.com/',
    chain: SupportedChain.POLYGON_AMOY,
    domainContractAddess: '0x579846cFDe1d332b4Fd8E28Ce8cb880c81e9b302',
    fullName: 'Polygon Amoy',
    id: 80002,
    image: '/assets/chains/Polygon.svg',
    isProduction: false,
    name: 'Amoy',
    nativeTokenSymbol: 'MATIC',
    registarContractAddress: '0x2Fa75727De367844b948172a94B5F752c2af8237',
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
    testnet: true,
    thirdwebChain: polygonAmoy,
  },
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        token: AcceptedToken.ETHER,
      },
      {
        contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        token: AcceptedToken.DAI,
      },
      {
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        token: AcceptedToken.USDC,
      },
    ],
    blockExplorerUrl: 'https://etherscan.com',
    chain: SupportedChain.ETHEREUM,
    domainContractAddess: '0x444463a3892EA730e43e3B54E8e45005a9Fe1fbd',
    fullName: 'Ethereum',
    id: 1,
    image: '/assets/chains/ethereum.svg',
    isProduction: true,
    name: 'Ethereum',
    nativeTokenSymbol: 'ETH',
    registarContractAddress: '0x7721a7C1472A565534A80511734Bc84fB27eb0a2',
    rpcUrl: 'https://mainnet.infura.io/v3/e9561b79c40044eea932e764d03895df',
    testnet: false,
    thirdwebChain: mainnet,
  },
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        token: AcceptedToken.MATIC,
      },
      {
        contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        token: AcceptedToken.DAI,
      },
      {
        contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        token: AcceptedToken.USDC,
      },
    ],
    blockExplorerUrl: 'https://polygonscan.com',
    chain: SupportedChain.POLYGON_MATIC,
    domainContractAddess: '0xB054ef071881a35a276dc434D95BF087a957736b',
    fullName: 'Polygon Mainnet',
    id: 137,
    image: '/assets/chains/Polygon.svg',
    isProduction: true,
    name: 'Polygon',
    nativeTokenSymbol: 'MATIC',
    registarContractAddress: '0xf652014545758Bae52A019CAf671a29A6B117759',
    rpcUrl: 'https://polygon-rpc.com',
    testnet: false,
    thirdwebChain: polygon,
  },
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        token: AcceptedToken.METIS,
      },
      {
        contractAddress: '0x0ea32a96608495e54156ae48931a7c20f0dcc1a21',
        token: AcceptedToken.USDC,
      },
    ],
    blockExplorerUrl: 'https://andromeda-explorer.metis.io',
    chain: SupportedChain.METIS_ANDROMEDA,
    domainContractAddess: '0xECfd0052945e235a1E4aE78C02F05F802282cb74',
    fullName: 'Metis Andromeda Mainnet',
    id: 1088,
    image: '/assets/chains/Metis.svg',
    isProduction: true,
    name: 'Metis',
    nativeTokenSymbol: 'METIS',
    registarContractAddress: '0x13B5065B2586f0D457641b4C4FA09C2550843F42',
    rpcUrl: 'https://andromeda.metis.io/?owner=1088',
    testnet: false,
    thirdwebChain: defineChain(metis),
  },
  {
    acceptableTokens: [
      {
        contractAddress: '0x471EcE3750Da237f93B8E339c536989b8978a438',
        displayName: 'Celo',
        icon: '/assets/chains/Celo.svg',
        token: AcceptedToken.CELO,
        walletSupported: true,
      },
      {
        contractAddress: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD
        displayName: 'Celo Dollar',
        icon: '/assets/tokens/CUSD.png',
        token: AcceptedToken.CUSD,
        walletSupported: true,
      },
      {
        contractAddress: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
        displayName: 'US Dollar Coin',
        icon: '/assets/tokens/USDC.svg',
        token: AcceptedToken.USDC,
        walletSupported: true,
      },
      {
        contractAddress: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
        displayName: 'Tether',
        icon: '/assets/tokens/USDT.svg',
        token: AcceptedToken.USDT,
        walletSupported: true,
      },
      {
        contractAddress: '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73',
        displayName: 'Celo Euro',
        icon: '/assets/tokens/CEUR.png',
        token: AcceptedToken.CEUR, // cEUR
        walletSupported: true,
      },
    ],
    blockExplorerUrl: 'https://explorer.celo.org',
    chain: SupportedChain.CELO,
    domainContractAddess: '0x000000000000000000000000000000000000ce10',
    fullName: 'Celo Mainnet',
    id: 42220,
    image: '/assets/chains/Celo.svg',
    isProduction: true,
    name: 'Celo',
    nativeTokenSymbol: 'CELO',
    registarContractAddress: '', // no applicable registar contract on Celo
    rpcUrl: 'https://forno.celo.org',
    testnet: false,
    thirdwebChain: celo,
    walletSupported: true,
  },
  {
    acceptableTokens: [
      {
        contractAddress: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
        token: AcceptedToken.CELO,
      },
      {
        contractAddress: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9', // Arbitrum-native USDC :contentReference[oaicite:1]{index=1}
        token: AcceptedToken.CUSD,
      },
    ],
    blockExplorerUrl: 'https://alfajores.celoscan.io',
    chain: SupportedChain.CELO_ALFAJORES,
    domainContractAddess: '0x0000000000000000000000000000000000000000', // N/A
    fullName: 'Celo Alfajores Testnet',
    id: 44787,
    image: '/assets/chains/Celo.svg',
    isProduction: false,
    name: 'Celo Alfajores',
    nativeTokenSymbol: 'ETH',
    registarContractAddress: '0x0000000000000000000000000000000000000000', // N/A
    rpcUrl: 'https://alfajores.celoscan.io',
    testnet: true,
    thirdwebChain: celoAlfajoresTestnet,
  },
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        displayName: 'Ethereum',
        icon: '/assets/chains/ethereum.svg',
        token: AcceptedToken.ETHER,
        walletSupported: false,
      },
      {
        contractAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum-native USDC :contentReference[oaicite:1]{index_1}
        displayName: 'US Dollar Coin',
        icon: '/assets/tokens/USDC.svg',
        token: AcceptedToken.USDC,
        walletSupported: true,
      },
      {
        contractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        displayName: 'Tether',
        icon: '/assets/tokens/USDT.svg',
        token: AcceptedToken.USDT,
        walletSupported: true,
      },
    ],
    blockExplorerUrl: 'https://arbiscan.io',
    chain: SupportedChain.ARBITRUM,
    domainContractAddess: '0x0000000000000000000000000000000000000000', // N/A
    fullName: 'Arbitrum One Mainnet',
    id: 42161,
    image: '/assets/chains/Arbitrum.svg',
    isProduction: true,
    name: 'Arbitrum',
    nativeTokenSymbol: 'ETH',
    registarContractAddress: '0x0000000000000000000000000000000000000000', // N/A
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    testnet: false,
    thirdwebChain: arbitrum,
    walletSupported: true, // Supported in wallet
  },
  {
    acceptableTokens: [
      {
        contractAddress: zeroAddress,
        displayName: 'Ethereum',
        icon: '/assets/chains/ethereum.svg',
        token: AcceptedToken.ETHER,
        walletSupported: false,
      },
      {
        contractAddress: '0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d', // Arbitrum-native USDC :contentReference[oaicite:1]{index_1}
        displayName: 'US Dollar Coin',
        icon: '/assets/tokens/USDC.svg',
        token: AcceptedToken.USDC,
        walletSupported: true,
      },
    ],
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    chain: SupportedChain.ARBITRUM_SEPOLIA,
    domainContractAddess: '0x0000000000000000000000000000000000000000', // N/A
    fullName: 'Arbitrum Sepolia',
    id: 421614,
    image: '/assets/chains/Arbitrum.svg',
    isProduction: false,
    name: 'Arbitrum Sepolia',
    nativeTokenSymbol: 'ETH',
    registarContractAddress: '0x0000000000000000000000000000000000000000', // N/A
    rpcUrl: 'https://sepolia.arbiscan.io/rpc',
    testnet: true,
    thirdwebChain: arbitrumSepolia,
    walletSupported: true, // Supported in wallet
  },
]
export const DEFAULT_CHAIN_ID = 42220

export const getTestnetChains = (): ChainInfo[] => {
  return supportedChains.filter(chain => chain.testnet)
}

export const getMainnetChains = (): ChainInfo[] => {
  return supportedChains.filter(chain => !chain.testnet)
}

export const getProductionChains = (): ChainInfo[] => {
  return supportedChains.filter(chain => chain.isProduction === true)
}

export const getDevelopmentChains = (): ChainInfo[] => {
  return supportedChains.filter(chain => chain.isProduction === false)
}

export const getChainInfo = (chain: SupportedChain): ChainInfo | undefined => {
  return supportedChains.find(c => c.chain === chain)
}

export const getSupportedChainFromId = (
  chainId: number
): ChainInfo | undefined => {
  return supportedChains.find(c => c.id === chainId)
}
export const getSupportedChain = (chain?: SupportedChain) => {
  return supportedChains.find(val => val.chain === chain)
}
export const getChainImage = (chain: SupportedChain) => {
  return getSupportedChain(chain)?.image
}

export const getNetworkDisplayName = (chain: SupportedChain): string => {
  const displayNames: Record<SupportedChain, string> = {
    [SupportedChain.ETHEREUM]: 'Ethereum',
    [SupportedChain.POLYGON_MATIC]: 'Polygon Matic',
    [SupportedChain.POLYGON_AMOY]: 'Polygon Amoy',
    [SupportedChain.SEPOLIA]: 'Sepolia',
    [SupportedChain.METIS_ANDROMEDA]: 'Metis Andromeda',
    [SupportedChain.ARBITRUM]: 'Arbitrum',
    [SupportedChain.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
    [SupportedChain.CELO_ALFAJORES]: 'Celo Alfajores',
    [SupportedChain.CELO]: 'Celo',
    [SupportedChain.CUSTOM]: 'Custom',
  }
  return displayNames[chain] || chain
}

// Helper function to get token address for a specific chain and token
export const getTokenAddress = (
  chain: SupportedChain,
  token: AcceptedToken
): string => {
  const chainInfo = getChainInfo(chain)
  if (!chainInfo) return ''

  const tokenInfo = chainInfo.acceptableTokens.find(t => t.token === token)
  return tokenInfo?.contractAddress || ''
}

// Helper function to get chain ID for a specific chain
export const getChainId = (chain: SupportedChain): number => {
  const chainInfo = getChainInfo(chain)
  return chainInfo?.id || 42220
}

export const getTokenFromName = (tokenName: string): AcceptedToken | null => {
  const lowerName = tokenName.toLowerCase()
  switch (lowerName) {
    case 'ether':
      return AcceptedToken.ETHER
    case 'polygon':
      return AcceptedToken.MATIC
    case 'metis':
      return AcceptedToken.METIS
    case 'dai':
      return AcceptedToken.DAI
    case 'usd coin':
      return AcceptedToken.USDC
    case 'tether usd':
      return AcceptedToken.USDT
    case 'euro':
      return AcceptedToken.EUR
    case 'celo':
      return AcceptedToken.CELO
    case 'celo dollar':
      return AcceptedToken.CUSD
    case 'celo euro':
      return AcceptedToken.CEUR
    default:
      return null
  }
}

// Helpers to build email payloads and send notifications
export const resolveTokenSymbolFromAddress = (
  chain: SupportedChain,
  tokenAddress: string
): string => {
  const chainInfo = getChainInfo(chain)
  const match = chainInfo?.acceptableTokens.find(
    t => (t.contractAddress || '').toLowerCase() === tokenAddress.toLowerCase()
  )
  return match ? getTokenSymbol(match.token) : 'UNKNOWN'
}

export const getChainDisplayName = (chain: SupportedChain): string =>
  getChainInfo(chain)?.name || String(chain)
