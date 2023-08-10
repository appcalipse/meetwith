import { zeroAddress } from 'viem'

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
  ETHEREUM = 'ETHEREUM',
  POLYGON_MATIC = 'POLYGON_MATIC',
  POLYGON_MUMBAI = 'POLYGON_MUMBAI',
  GOERLI = 'GOERLI',
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

export const getNativeDecimals = (chain: SupportedChain): number => {
  // all supported tokens for now have 18 decimals
  return 18
}

export const supportedChains: ChainInfo[] = [
  {
    chain: SupportedChain.GOERLI,
    id: 5,
    name: 'Goerli',
    fullName: 'Ethereum Goerli',
    rpcUrl: 'https://goerli.infura.io/v3/5866998bf8ac4efdb45916f8e8c027d4',
    testnet: true,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0xB95817e0F4D293E00F58eAcc4872273E9A9F764f',
    registarContractAddress: '0xcc7f7D0Dd776a5ea17683eF6253DF8aCD3CBFA63',
    blockExplorerUrl: 'https://goerli.etherscan.com',
    acceptableTokens: [
      {
        token: AcceptedToken.ETHER,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x2B1a67268BD808781bf5Eb761f1c43987dfa8E33',
      },
    ],
  },
  {
    chain: SupportedChain.POLYGON_MUMBAI,
    id: 80001,
    name: 'Mumbai',
    fullName: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.matic.today',
    testnet: true,
    nativeTokenSymbol: 'MATIC',
    domainContractAddess: '0x87cEbF6684488998bd48C07E0691D31b64D30e2A',
    registarContractAddress: '0xDD853a88ACbD365085D17448a97DD6123fE91b4A',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
    acceptableTokens: [
      {
        token: AcceptedToken.MATIC,
        contractAddress: zeroAddress,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x9Cb38ff196107750Fe05FDE9a5c449319DD9f848',
      },
    ],
  },
  {
    chain: SupportedChain.ETHEREUM,
    id: 1,
    name: 'Ethereum',
    fullName: 'Ethereum',
    rpcUrl:
      'https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7',
    testnet: false,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x444463a3892EA730e43e3B54E8e45005a9Fe1fbd',
    registarContractAddress: '0x7721a7C1472A565534A80511734Bc84fB27eb0a2',
    blockExplorerUrl: 'https://etherscan.com',
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
    name: 'Polygon',
    fullName: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    testnet: false,
    nativeTokenSymbol: 'MATIC',
    domainContractAddess: '0xB054ef071881a35a276dc434D95BF087a957736b',
    registarContractAddress: '0xf652014545758Bae52A019CAf671a29A6B117759',
    blockExplorerUrl: 'https://polygonscan.com',
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
    id: 1088,
    name: 'Metis',
    fullName: 'Metis Andromeda Mainnet',
    rpcUrl: 'https://andromeda.metis.io/?owner=1088',
    testnet: false,
    nativeTokenSymbol: 'METIS',
    domainContractAddess: '0xECfd0052945e235a1E4aE78C02F05F802282cb74',
    registarContractAddress: '0x13B5065B2586f0D457641b4C4FA09C2550843F42',
    blockExplorerUrl: 'https://andromeda-explorer.metis.io',
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
