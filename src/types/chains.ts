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
  ETHEREUM = 'ETHEREUM',
  POLYGON_MATIC = 'POLYGON_MATIC',
  POLYGON_MUMBAI = 'POLYGON_MUMBAI',
  HARMONY = 'HARMONY',
  RINEKBY = 'RINEKBY',
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
    chain: SupportedChain.RINEKBY,
    id: 4,
    name: 'Rinkeby',
    fullName: 'Ethereum Rinkeby',
    rpcUrl: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    testnet: true,
    nativeTokenSymbol: 'ETH',
    domainContractAddess: '0x342cc148d27Ae69acA7Cc56BafEd0D4c3f06695F',
    registarContractAddress: '0x0B63ea2262CD64fE3A032Fc220b5352Ff98c7EA3',
    blockExplorerUrl: 'https://rinkeby.etherscan.com',
    acceptableTokens: [
      {
        token: AcceptedToken.ETHER,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xCEaB09d857B7fB420C01BFFba2976F9D5eB38f0F',
      },
    ],
  },
  {
    chain: SupportedChain.POLYGON_MUMBAI,
    id: 80001,
    name: 'Mumbai',
    fullName: 'Polygon Mumbai',
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
        contractAddress: ethers.constants.AddressZero,
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
        contractAddress: ethers.constants.AddressZero,
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
    chain: SupportedChain.HARMONY,
    id: 1666600000,
    name: 'Harmony',
    fullName: 'Harmony Mainnet Shard 0',
    rpcUrl: 'https://api.harmony.one',
    testnet: false,
    nativeTokenSymbol: 'ONE',
    domainContractAddess: '0x45eB1cFf81A01DdC89eE2C4ad122fFB260e0C5e1',
    registarContractAddress: '0x1DF8FcA6035342eeD37c3C10dcD4cC1B4030628D',
    blockExplorerUrl: 'https://explorer.harmony.one',
    acceptableTokens: [
      {
        token: AcceptedToken.ONE,
        contractAddress: ethers.constants.AddressZero,
      },
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xef977d2f931c1978db5f6747666fa1eacb0d0339',
      },
      {
        token: AcceptedToken.USDC,
        contractAddress: '0x985458e523db3d53125813ed68c274899e9dfab4',
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
        contractAddress: ethers.constants.AddressZero,
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
