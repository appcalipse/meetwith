import { ethers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'

interface AccountExtraProps {
  name: string
  avatar?: string
}

export const resolveExtraInfo = async (
  address: string
): Promise<AccountExtraProps | undefined> => {
  return await resolveENS(address)
}

const resolveENS = async (
  address: string
): Promise<AccountExtraProps | undefined> => {
  let provider: JsonRpcProvider

  if (window.ethereum && window.ethereum.chainId === '0x1') {
    provider = new ethers.providers.Web3Provider(window.ethereum)
  } else {
    provider = new ethers.providers.InfuraProvider(
      'homestead',
      process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID
    )
  }

  la(provider)

  const name = await provider.lookupAddress(address)

  if (!name) {
    return undefined
  }

  const resolver = await provider.getResolver(name)

  const validatedAddress = await resolver?.getAddress()

  // Check to be sure the reverse record is correct.
  if (address.toLowerCase() !== validatedAddress?.toLowerCase()) {
    return undefined
  }

  const avatarInfo = await resolver?.getText('avatar')
  const avatar = avatarInfo ? (await resolver?.getAvatar())?.url : undefined

  return {
    name,
    avatar,
  }
}

const la = (provider: any) => {
  provider = new ethers.providers.Web3Provider(window.ethereum)
  const aggregatorV3InterfaceABI = [
    {
      inputs: [],
      name: 'decimals',
      outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'description',
      outputs: [{ internalType: 'string', name: '', type: 'string' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'uint80', name: '_roundId', type: 'uint80' }],
      name: 'getRoundData',
      outputs: [
        { internalType: 'uint80', name: 'roundId', type: 'uint80' },
        { internalType: 'int256', name: 'answer', type: 'int256' },
        { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
        { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
        { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'latestRoundData',
      outputs: [
        { internalType: 'uint80', name: 'roundId', type: 'uint80' },
        { internalType: 'int256', name: 'answer', type: 'int256' },
        { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
        { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
        { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'version',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ]
  const addr = '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0'
  const priceFeed = new ethers.Contract(
    addr,
    aggregatorV3InterfaceABI,
    provider
  )
  priceFeed.decimals().then(console.log)
  priceFeed.latestRoundData().then((roundData: any) => {
    // Do something with roundData
    console.log('Latest Round Data', roundData)
    console.log('number', roundData.answer.toString())
  })
}
