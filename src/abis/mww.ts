export const MWWDomain = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_registar',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'subscriber',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'originalDomain',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'newDomain',
        type: 'string',
      },
    ],
    name: 'MWWDomainChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'subscriber',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'planId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiryTime',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
    ],
    name: 'MWWSubscribed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'delegate',
        type: 'address',
      },
    ],
    name: 'addDelegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'planId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiryTime',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'domain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'configIpfsHash',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct MWWStructs.Domain[]',
        name: 'domainsToAdd',
        type: 'tuple[]',
      },
    ],
    name: 'addDomains',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'newDomain',
        type: 'string',
      },
    ],
    name: 'changeDomain',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'planId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiryTime',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'domain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'configIpfsHash',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct MWWStructs.Domain',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'ipfsHash',
        type: 'string',
      },
    ],
    name: 'changeDomainConfigHash',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'domains',
    outputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'planId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'expiryTime',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'configIpfsHash',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'registeredAt',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
    ],
    name: 'getDelegatesForDomain',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'getDomainsForAccount',
    outputs: [
      {
        internalType: 'string[]',
        name: '',
        type: 'string[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
    ],
    name: 'isDelegate',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
    ],
    name: 'isSubscriptionActive',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'registerContract',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'removeAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'address',
        name: 'delegate',
        type: 'address',
      },
    ],
    name: 'removeDelegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_address',
        type: 'address',
      },
    ],
    name: 'setRegisterContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'originalCaller',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'planId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'planOwner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'duration',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'ipfsHash',
        type: 'string',
      },
    ],
    name: 'subscribe',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'planId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiryTime',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'domain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'configIpfsHash',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct MWWStructs.Domain',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const MWWRegister = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'planOwner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'MWWPurchase',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
    ],
    name: 'addAcceptableToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_usdPrice',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: '_planId',
        type: 'uint8',
      },
    ],
    name: 'addPlan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'domainContract',
    outputs: [
      {
        internalType: 'contract MWWDomain',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAvailablePlans',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'usdPrice',
            type: 'uint256',
          },
        ],
        internalType: 'struct MWWRegistarBase.PlanInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'usdPrice',
        type: 'uint256',
      },
    ],
    name: 'getNativeConvertedValue',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amountInNative',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: 'planId',
        type: 'uint8',
      },
      {
        internalType: 'address',
        name: 'planOwner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'duration',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'ipfsHash',
        type: 'string',
      },
    ],
    name: 'purchaseWithNative',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'planId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiryTime',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'domain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'configIpfsHash',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct MWWStructs.Domain',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
      {
        internalType: 'uint8',
        name: 'planId',
        type: 'uint8',
      },
      {
        internalType: 'address',
        name: 'planOwner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'duration',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'domain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'ipfsHash',
        type: 'string',
      },
    ],
    name: 'purchaseWithToken',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'planId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiryTime',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'domain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'configIpfsHash',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'registeredAt',
            type: 'uint256',
          },
        ],
        internalType: 'struct MWWStructs.Domain',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
    ],
    name: 'removeAcceptableToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: '_index',
        type: 'uint8',
      },
      {
        internalType: 'uint8',
        name: 'planId',
        type: 'uint8',
      },
    ],
    name: 'removePlan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_address',
        type: 'address',
      },
    ],
    name: 'setDomainContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'destination',
        type: 'address',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]
