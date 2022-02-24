export interface ChainInfo {
  chain: SupportedChain
  id: number
  name: string
  rpcUrl: string
  testnet: boolean
  nativeTokenSymbol: string
  subscriptionContractAddess: string
  registerContractAddress: string
  acceptableTokens: AcceptedTokenInfo[]
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
  DAI = 'DAI',
  USDC = 'USDC',
}

export interface AcceptedTokenInfo {
  token: AcceptedToken
  contractAddress: string
}

export const supportedChains: ChainInfo[] = [
  // {
  //   chain: SupportedChain.POLYGON_MATIC,
  //   id: 1,
  //   name: 'Polygon',
  //   rpcUrl: 'https://api.polygon.io/v2',
  //   testnet: false,
  //   nativeTokenSymbol: 'MATIC',
  //   subscriptionContractAddess: '0xcc7f7D0Dd776a5ea17683eF6253DF8aCD3CBFA63',
  //   registerContractAddress: '0x1DF8FcA6035342eeD37c3C10dcD4cC1B4030628D',
  // },
  {
    chain: SupportedChain.POLYGON_MUMBAI,
    id: 80001,
    name: 'Mumbai',
    rpcUrl: 'https://rpc-mumbai.matic.today',
    testnet: true,
    nativeTokenSymbol: 'MATIC',
    subscriptionContractAddess: '0xFf8d4104D0bcE4ad3480326Ea8202514CBF09B6C',
    registerContractAddress: '0xe4F495ddE614F07212A1cAFEdbdD45250040ccb1',
    acceptableTokens: [
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xA2de063a9Fe5A68ddb1CF85890A30893b117be2d',
      },
    ],
  },
  {
    chain: SupportedChain.HARMONY_TESTNET,
    id: 1,
    name: 'Harmon Testnet',
    rpcUrl: 'https://api.s0.b.hmny.io',
    testnet: true,
    nativeTokenSymbol: 'ONE',
    subscriptionContractAddess: '0x16B589300B32C967CA3fd4386Ae904F93FC2B53e',
    registerContractAddress: '0xF134578d326479FD3aA7c9f861AA8F84FD1f4A82',
    acceptableTokens: [
      {
        token: AcceptedToken.DAI,
        contractAddress: '0xD3F1eE2b69ffCF8AcD20ef79Fd6697Ceb99Ae024',
      },
    ],
  },

  {
    chain: SupportedChain.METIS_STARTDUST,
    id: 1,
    name: 'Metis Stardust',
    rpcUrl: 'https://stardust.metis.io/?owner=588',
    testnet: true,
    nativeTokenSymbol: 'METIS',
    subscriptionContractAddess: '0x2809e5Cf4776640D0Da184605B0c82F803e97EFc',
    registerContractAddress: '0xcc7f7D0Dd776a5ea17683eF6253DF8aCD3CBFA63',
    acceptableTokens: [
      {
        token: AcceptedToken.DAI,
        contractAddress: '0x2B1a67268BD808781bf5Eb761f1c43987dfa8E33',
      },
    ],
  },
  //   {
  //     chain: SupportedChain.HARMONY,
  //     id: 1,
  //     name: 'Harmony',
  //     rpcUrl: 'https://api.harmony.one',
  //     testnet: false,
  //     nativeTokenSymbol: 'ONE',
  //     subscriptionContractAddess: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //     registerContractAddress: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //   },
  //
  //   {
  //     chain: SupportedChain.METIS_ANDROMEDA,
  //     id: 1,
  //     name: 'Metis Andromeda',
  //     rpcUrl: 'https://andromeda.metis.io/?owner=1088',
  //     testnet: false,
  //     nativeTokenSymbol: 'METIS',
  //     subscriptionContractAddess: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //     registerContractAddress: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //   },
  //
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
