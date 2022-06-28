import { CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { useEffect, useState } from 'react'

import {
  getMainnetChains,
  getTestnetChains,
  SupportedChain,
} from '@/types/chains'
import { TokenGateElement, TokenInterface } from '@/types/TokenGating'
import { getPOAPEvent } from '@/utils/api_helper'
import { isProduction } from '@/utils/constants'
import { useDebounce } from '@/utils/generic_utils'
import { getTokenInfo } from '@/utils/token.service'
import { isValidEVMAddress } from '@/utils/validations'

interface TokenGateElementComponentProps {
  tokenInfo: TokenGateElement
  position: number
  onChange: (tokenInfo: TokenGateElement, position: number) => void
  onRemove: (position: number) => void
}

export const TokenGateElementComponent = (
  props: TokenGateElementComponentProps
) => {
  const [minimumBalance, setMinimumBalance] = useState(
    props.tokenInfo?.minimumBalance
      .div(BigNumber.from((10 ** (props.tokenInfo.decimals || 1)).toString()))
      .toString()
  )

  const changeMinimumAmount = (value: string) => {
    try {
      const valueAsFloat = parseFloat(value)
      const info = props.tokenInfo
      info.minimumBalance = BigNumber.from(
        (valueAsFloat * 10 ** (props.tokenInfo.decimals || 1)).toString()
      )
      props.onChange(info, props.position)
    } catch (e) {}
    setMinimumBalance(value)
  }

  const setType = (type: TokenInterface) => {
    const info = props.tokenInfo
    info.type = type
    props.onChange(info, props.position)
  }

  const setTokenAddress = (address: string) => {
    const info = props.tokenInfo
    info.tokenAddress = address
    props.onChange(info, props.position)
  }

  const setChain = (chain: SupportedChain) => {
    const info = props.tokenInfo
    info.chain = chain
    props.onChange(info, props.position)
  }

  return (
    <Flex
      position="relative"
      borderRadius={6}
      borderColor={props.tokenInfo.tokenName ? 'orange.500' : 'gray.500'}
      borderWidth={2}
    >
      <Box position="absolute" right={0} top={0}>
        <IconButton
          aria-label="close"
          isRound
          variant="ghost"
          icon={<CloseIcon />}
          onClick={() => props.onRemove(props.position)}
        />
      </Box>
      <Box p={4} mt={2}>
        <FormControl>
          <FormLabel>Type</FormLabel>
          <Select
            value={props.tokenInfo.type}
            onChange={e => setType(e.target.value as TokenInterface)}
          >
            <option value={TokenInterface.ERC20}>ERC20</option>
            <option value={TokenInterface.ERC721}>NFT/ERC721</option>
            <option value={TokenInterface.POAP}>POAP</option>
          </Select>
        </FormControl>

        {[
          TokenInterface.ERC20,
          TokenInterface.ERC721,
          TokenInterface.ERC1155,
        ].includes(props.tokenInfo!.type) && (
          <TokenForm
            tokenInfo={props.tokenInfo}
            onChange={props.onChange}
            position={props.position}
            setChain={setChain}
            setTokenAddress={setTokenAddress}
            changeMinimumAmount={changeMinimumAmount}
            minimumBalance={minimumBalance}
          />
        )}

        {props.tokenInfo.type === TokenInterface.POAP && (
          <POAPForm
            tokenInfo={props.tokenInfo}
            onChange={props.onChange}
            position={props.position}
            setTokenAddress={setTokenAddress}
          />
        )}
      </Box>
    </Flex>
  )
}

const TokenForm: React.FC<{
  tokenInfo: TokenGateElement | undefined
  position: number
  onChange: (tokenInfo: TokenGateElement, position: number) => void
  setTokenAddress: (address: string) => void
  setChain: (chain: SupportedChain) => void
  changeMinimumAmount: (value: string) => void
  minimumBalance: string
}> = ({
  tokenInfo,
  position,
  onChange,
  setTokenAddress,
  setChain,
  changeMinimumAmount,
  minimumBalance,
}) => {
  const [loadingToken, setLoadingToken] = useState(false)
  const [invalidTokenAddress, setInvalidTokenAddress] = useState(false)

  const [haveMinimumAmoun, setHaveMinimumAmount] = useState(
    tokenInfo?.minimumBalance ? !tokenInfo!.minimumBalance.isZero() : false
  )

  const chains = isProduction ? getMainnetChains() : getTestnetChains()

  const debouncedTokenAddress = useDebounce(tokenInfo?.tokenAddress, 300)

  useEffect(() => {
    checkTokenInfo()
  }, [debouncedTokenAddress])

  const checkTokenInfo = async () => {
    setLoadingToken(true)
    setInvalidTokenAddress(false)
    if (isValidEVMAddress(tokenInfo!.tokenAddress)) {
      const info = await getTokenInfo(
        tokenInfo!.tokenAddress,
        tokenInfo!.chain!
      )
      let _tokenInfo: TokenGateElement = {
        type: TokenInterface.ERC20,
        tokenName: '',
        tokenSymbol: '',
        tokenAddress: tokenInfo!.tokenAddress,
        chain: tokenInfo!.chain,
        minimumBalance: tokenInfo!.minimumBalance,
      }
      if (info) {
        _tokenInfo = {
          ...info,
          minimumBalance: tokenInfo!.minimumBalance,
        }
      } else if (tokenInfo!.tokenAddress) {
        setInvalidTokenAddress(true)
      }
      onChange(_tokenInfo, position)
    }
    setLoadingToken(false)
  }

  return (
    <>
      <FormControl mt={2}>
        <FormLabel>Chain</FormLabel>
        <Select
          value={tokenInfo?.chain}
          onChange={e => setChain(e.target.value as SupportedChain)}
        >
          {chains.map(chain => (
            <option key={chain.chain} value={chain.chain}>
              {chain.name}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl isInvalid={invalidTokenAddress} mt={2}>
        <FormLabel>Token address</FormLabel>
        <InputGroup>
          <Input
            value={tokenInfo?.tokenAddress}
            type="text"
            placeholder="0x0000000000000000000000000000000000000000"
            onChange={event => setTokenAddress(event.target.value)}
          />
        </InputGroup>
        <FormErrorMessage>
          Address is invalid and token information couldn&apos;t be fetch
        </FormErrorMessage>
      </FormControl>

      <HStack mt={2}>
        <InputGroup>
          <Input
            value={tokenInfo?.tokenName}
            type="text"
            disabled
            placeholder="Name"
          />
          {
            <InputRightElement
              children={loadingToken && <Spinner size="sm" />}
            />
          }
        </InputGroup>
        <InputGroup>
          <Input
            value={tokenInfo?.tokenSymbol}
            type="text"
            disabled
            placeholder="Symbol"
          />
          {
            <InputRightElement
              children={loadingToken && <Spinner size="sm" />}
            />
          }
        </InputGroup>
      </HStack>
      {!haveMinimumAmoun && (
        <Flex justifyContent="flex-end" mt={2}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHaveMinimumAmount(true)}
            disabled={tokenInfo?.tokenName === ''}
          >
            Set a minimium amount
          </Button>
        </Flex>
      )}
      {haveMinimumAmoun && (
        <FormControl mt={2}>
          <FormLabel>Minimum amount</FormLabel>
          <NumberInput
            value={minimumBalance}
            onChange={(valueAsString, valueAsNumber) =>
              changeMinimumAmount(valueAsString)
            }
            inputMode="decimal"
            pattern="[0-9]*(.[0-9]+)?"
            placeholder="0.0"
            autoComplete="off"
            autoCorrect="off"
            min={0}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      )}
    </>
  )
}

const POAPForm: React.FC<{
  tokenInfo: TokenGateElement | undefined
  position: number
  onChange: (tokenInfo: TokenGateElement, position: number) => void
  setTokenAddress: (address: string) => void
}> = ({ tokenInfo, position, onChange, setTokenAddress }) => {
  const [loadingToken, setLoadingToken] = useState(false)
  const [invalidTokenAddress, setInvalidTokenAddress] = useState(false)

  const debouncedTokenAddress = useDebounce(tokenInfo?.tokenAddress, 300)

  useEffect(() => {
    checkTokenInfo()
  }, [debouncedTokenAddress])

  const checkTokenInfo = async () => {
    setLoadingToken(true)
    setInvalidTokenAddress(false)
    let _tokenInfo: TokenGateElement = {
      type: TokenInterface.POAP,
      tokenName: '',
      tokenSymbol: '',
      tokenAddress: tokenInfo!.tokenAddress,
      minimumBalance: BigNumber.from(1),
    }
    if (!isNaN(parseInt(tokenInfo!.tokenAddress))) {
      const info = await getPOAPEvent(parseInt(tokenInfo!.tokenAddress))

      if (info) {
        _tokenInfo = {
          ..._tokenInfo,
          tokenName: info.name,
          tokenSymbol: '',
          tokenLogo: info.image_url,
        }
      } else if (tokenInfo!.tokenAddress) {
        setInvalidTokenAddress(true)
      }
    }
    onChange(_tokenInfo, position)
    setLoadingToken(false)
  }

  const bgColor = useColorModeValue('gray.200', 'gray.800')

  return (
    <>
      <FormControl isInvalid={invalidTokenAddress} mt={2}>
        <FormLabel>Event Id</FormLabel>
        <InputGroup>
          <Input
            value={tokenInfo?.tokenAddress}
            type="number"
            placeholder="1234"
            onChange={event => setTokenAddress(event.target.value)}
          />
        </InputGroup>
        <FormErrorMessage>Event not found on POAP</FormErrorMessage>
      </FormControl>

      <HStack mt={2}>
        <Box p={2}>
          {!tokenInfo?.tokenName ? (
            <Box position="relative">
              <Box
                width={'32px'}
                height={'32px'}
                borderRadius={'50%'}
                bgColor={bgColor}
              />
              {loadingToken && (
                <Spinner size="sm" position="absolute" left="8px" top="8px" />
              )}
            </Box>
          ) : (
            <Image w={'40px'} src={tokenInfo?.tokenLogo} />
          )}
        </Box>
        <InputGroup>
          <Input
            value={tokenInfo?.tokenName}
            type="text"
            disabled
            placeholder="Name"
          />
          {
            <InputRightElement
              children={loadingToken && <Spinner size="sm" />}
            />
          }
        </InputGroup>
      </HStack>
    </>
  )
}
