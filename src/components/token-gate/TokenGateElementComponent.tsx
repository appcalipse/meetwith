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
import { useEffect, useRef, useState } from 'react'

import {
  getMainnetChains,
  getTestnetChains,
  SupportedChain,
} from '@/types/chains'
import {
  GateInterface,
  getNativeTokenInfo,
  TokenGateElement,
} from '@/types/TokenGating'
import { getPOAPEvent } from '@/utils/api_helper'
import { isProduction } from '@/utils/constants'
import { formatUnits, useDebounce } from '@/utils/generic_utils'
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
    formatUnits(props.tokenInfo?.minimumBalance, props.tokenInfo.decimals || 1)
  )

  const changeMinimumAmount = (value: string) => {
    try {
      const valueAsFloat = parseFloat(value)
      const info = props.tokenInfo
      info.minimumBalance = BigInt(
        (valueAsFloat * 10 ** (props.tokenInfo.decimals || 0)).toString()
      )
      props.onChange(info, props.position)
    } catch (e) {}
    setMinimumBalance(value)
  }

  const setType = (type: GateInterface) => {
    const info = props.tokenInfo
    info.type = type
    if (type === GateInterface.NATIVE) {
      const native = getNativeTokenInfo(info.chain!)
      info.itemName = native.itemName
      info.itemSymbol = native.itemSymbol
      info.decimals = native.decimals
      info.itemId = native.itemId
    }
    props.onChange(info, props.position)
  }

  const setTokenAddress = (address: string) => {
    const info = props.tokenInfo
    info.itemId = address
    props.onChange(info, props.position)
  }

  const setChain = (chain: SupportedChain) => {
    const info = props.tokenInfo
    info.chain = chain
    if (info.type === GateInterface.NATIVE) {
      const native = getNativeTokenInfo(info.chain!)
      info.itemName = native.itemName
      info.itemSymbol = native.itemSymbol
      info.decimals = native.decimals
      info.itemId = native.itemId
    }
    props.onChange(info, props.position)
  }

  return (
    <Flex
      position="relative"
      borderRadius={6}
      borderColor={props.tokenInfo.itemName ? 'primary.500' : 'neutral.500'}
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
            onChange={(e: any) => setType(e.target.value as GateInterface)}
          >
            <option value={GateInterface.NATIVE}>
              Chain&apos;s native token
            </option>
            <option value={GateInterface.ERC20}>ERC20</option>
            <option value={GateInterface.ERC721}>NFT/ERC721</option>
            <option value={GateInterface.POAP}>POAP</option>
          </Select>
        </FormControl>

        {[
          GateInterface.ERC20,
          GateInterface.ERC721,
          GateInterface.ERC1155,
          GateInterface.NATIVE,
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

        {props.tokenInfo.type === GateInterface.POAP && (
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
  const [firstLoad, setFirstLoad] = useState(true)
  const [invalidTokenAddress, setInvalidTokenAddress] = useState(false)
  const [haveMinimumAmount, setHaveMinimumAmount] = useState(
    tokenInfo?.minimumBalance ? !(tokenInfo!.minimumBalance == 0n) : false
  )

  const chains = isProduction ? getMainnetChains() : getTestnetChains()

  const debouncedTokenAddress = useDebounce(tokenInfo?.itemId, 300)

  const isMountedRef = useRef(true)

  useEffect(() => {
    setFirstLoad(false)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    if (!firstLoad || (tokenInfo?.itemId && !tokenInfo.itemName)) {
      checkTokenInfo()
    }
    return () => {
      void (isMountedRef.current = false)
    }
  }, [debouncedTokenAddress])

  const checkTokenInfo = async () => {
    setLoadingToken(true)
    setInvalidTokenAddress(false)
    if (
      [
        GateInterface.ERC1155,
        GateInterface.ERC20,
        GateInterface.ERC721,
      ].includes(tokenInfo!.type) &&
      isValidEVMAddress(tokenInfo!.itemId)
    ) {
      const info = await getTokenInfo(
        tokenInfo!.itemId as `0x${string}`,
        tokenInfo!.chain!
      )
      let _tokenInfo: TokenGateElement = {
        type: GateInterface.ERC20,
        itemName: '',
        itemSymbol: '',
        itemId: tokenInfo!.itemId,
        chain: tokenInfo!.chain,
        minimumBalance: tokenInfo!.minimumBalance,
      }

      if (info) {
        _tokenInfo = {
          ...info,
          minimumBalance: tokenInfo!.minimumBalance,
        }
      } else if (tokenInfo!.itemId) {
        setInvalidTokenAddress(true)
      }
      !!isMountedRef.current && onChange(_tokenInfo, position)
    }
    setLoadingToken(false)
  }

  return (
    <>
      <FormControl mt={2}>
        <FormLabel>Chain</FormLabel>
        <Select
          value={tokenInfo?.chain}
          onChange={(e: any) =>
            !loadingToken && setChain(e.target.value as SupportedChain)
          }
        >
          {chains.map(chain => (
            <option key={chain.chain} value={chain.chain}>
              {chain.name}
            </option>
          ))}
        </Select>
      </FormControl>

      {tokenInfo?.type !== GateInterface.NATIVE && (
        <FormControl isInvalid={invalidTokenAddress} mt={2}>
          <FormLabel>Token address</FormLabel>
          <InputGroup>
            <Input
              value={tokenInfo?.itemId}
              type="text"
              placeholder="0x0000000000000000000000000000000000000000"
              onChange={event =>
                !loadingToken && setTokenAddress(event.target.value)
              }
            />
          </InputGroup>
          <FormErrorMessage>
            Address is invalid and token information couldn&apos;t be fetched
          </FormErrorMessage>
        </FormControl>
      )}

      <HStack mt={2}>
        <InputGroup>
          <Input
            value={tokenInfo?.itemName}
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
            value={tokenInfo?.itemSymbol}
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
      {!haveMinimumAmount && (
        <Flex justifyContent="flex-end" mt={2}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => !loadingToken && setHaveMinimumAmount(true)}
            isDisabled={tokenInfo?.itemName === ''}
          >
            Set a minimium amount
          </Button>
        </Flex>
      )}
      {haveMinimumAmount && (
        <FormControl mt={2}>
          <FormLabel>Minimum amount</FormLabel>
          <NumberInput
            value={minimumBalance}
            onChange={(valueAsString, valueAsNumber) =>
              !loadingToken && changeMinimumAmount(valueAsString)
            }
            inputMode="decimal"
            pattern="[0-9]*(.[0-9]+)?"
            autoCorrect="off"
            min={0}
          >
            <NumberInputField placeholder="0.0" />
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
  const [firstLoad, setFirstLoad] = useState(true)
  const [invalidTokenAddress, setInvalidTokenAddress] = useState(false)

  const debouncedTokenAddress = useDebounce(tokenInfo?.itemId, 300)

  const isMountedRef = useRef(true)
  useEffect(() => {
    setFirstLoad(false)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    if (!firstLoad || (tokenInfo?.itemId && !tokenInfo.itemName)) {
      checkTokenInfo()
    }
    return () => {
      void (isMountedRef.current = false)
    }
  }, [debouncedTokenAddress])

  const checkTokenInfo = async () => {
    setLoadingToken(true)
    setInvalidTokenAddress(false)
    let _tokenInfo: TokenGateElement = {
      type: GateInterface.POAP,
      itemName: '',
      itemSymbol: '',
      itemId: tokenInfo!.itemId,
      minimumBalance: 1n,
    }
    if (!isNaN(parseInt(tokenInfo!.itemId))) {
      const info = await getPOAPEvent(parseInt(tokenInfo!.itemId))

      if (info) {
        _tokenInfo = {
          ..._tokenInfo,
          itemName: info.name,
          itemSymbol: '',
          itemLogo: info.image_url,
        }
      } else if (tokenInfo!.itemId) {
        setInvalidTokenAddress(true)
      }
    }
    !!isMountedRef.current && onChange(_tokenInfo, position)
    setLoadingToken(false)
  }

  const bgColor = useColorModeValue('gray.200', 'gray.800')

  return (
    <>
      <FormControl isInvalid={invalidTokenAddress} mt={2}>
        <FormLabel>Event Id</FormLabel>
        <InputGroup>
          <Input
            value={tokenInfo?.itemId}
            type="number"
            placeholder="1234"
            onChange={event =>
              !loadingToken && setTokenAddress(event.target.value)
            }
          />
        </InputGroup>
        <FormErrorMessage>Event not found on POAP</FormErrorMessage>
      </FormControl>

      <HStack mt={2}>
        <Box p={2}>
          {!tokenInfo?.itemName ? (
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
            <Image
              w={'40px'}
              src={tokenInfo?.itemLogo}
              alt={tokenInfo?.itemName}
            />
          )}
        </Box>
        <InputGroup>
          <Input
            value={tokenInfo?.itemName}
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
