export interface ChainInfo {
  chain: SupportedChain
  id: number
  name: string
  rpcUrl: string
  testnet: boolean
  nativeTokenSymbol: string
  subscriptionContractAddess: string
  registerContractAddress: string
}

export enum SupportedChain {
  POLYGON_MATIC = 'POLYGON_MATIC',
  POLYGON_MUMBAI = 'POLYGON_MUMBAI',
  HARMONY = 'HARMONY',
  HARMONY_TESTNET = 'HARMONY_TESTNET',
  METIS_ANDROMEDA = 'METIS_ANDROMEDA',
  METIS_STARTDUST = 'METIS_STARTDUST',
}

export const supportedChains: ChainInfo[] = [
  {
    chain: SupportedChain.POLYGON_MATIC,
    id: 1,
    name: 'Polygon',
    rpcUrl: 'https://api.polygon.io/v2',
    testnet: false,
    nativeTokenSymbol: 'MATIC',
    subscriptionContractAddess: '0xcc7f7D0Dd776a5ea17683eF6253DF8aCD3CBFA63',
    registerContractAddress: '0x1DF8FcA6035342eeD37c3C10dcD4cC1B4030628D',
  },
  {
    chain: SupportedChain.POLYGON_MUMBAI,
    id: 80001,
    name: 'Mumbai',
    rpcUrl: 'https://rpc-mumbai.matic.today',
    testnet: true,
    nativeTokenSymbol: 'MATIC',
    subscriptionContractAddess: '0xcc7f7D0Dd776a5ea17683eF6253DF8aCD3CBFA63',
    registerContractAddress: '0x1DF8FcA6035342eeD37c3C10dcD4cC1B4030628D',
  },
  //   {
  //     chain: SupportedChain.HARMONY,
  //     id: 1,
  //     name: 'Harmony',
  //     rpcUrl: 'https://api.polygon.io/v2',
  //     testnet: false,
  //     nativeTokenSymbol: 'ONE',
  //     subscriptionContractAddess: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //     registerContractAddress: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //   },
  //   {
  //     chain: SupportedChain.HARMONY_TESTNET,
  //     id: 1,
  //     name: 'Harmon Testnet',
  //     rpcUrl: 'https://api.polygon.io/v2',
  //     testnet: true,
  //     nativeTokenSymbol: 'ONE',
  //     subscriptionContractAddess: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //     registerContractAddress: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //   },
  //   {
  //     chain: SupportedChain.METIS_ANDROMEDA,
  //     id: 1,
  //     name: 'Metis Andromeda',
  //     rpcUrl: 'https://api.polygon.io/v2',
  //     testnet: false,
  //     nativeTokenSymbol: 'METIS',
  //     subscriptionContractAddess: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //     registerContractAddress: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //   },
  //   {
  //     chain: SupportedChain.METIS_STARTDUST,
  //     id: 1,
  //     name: 'Metis Stardust',
  //     rpcUrl: 'https://api.polygon.io/v2',
  //     testnet: true,
  //     nativeTokenSymbol: 'METIS',
  //     subscriptionContractAddess: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //     registerContractAddress: '0x9c8c6f9f8e8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f',
  //   },
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
