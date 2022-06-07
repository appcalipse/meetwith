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
  Text,
} from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { useEffect, useState } from 'react'

import {
  getMainnetChains,
  getTestnetChains,
  SupportedChain,
} from '@/types/chains'
import { TokenGateElement, TokenInterface } from '@/types/TokenGating'
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
  const [haveMinimumAmoun, setHaveMinimumAmount] = useState(
    props.tokenInfo.minimumBalance
      ? !props.tokenInfo.minimumBalance.isZero()
      : false
  )
  const [minimumBalance, setMinimumBalance] = useState(
    props.tokenInfo.minimumBalance
      .div(BigNumber.from((10 ** (props.tokenInfo.decimals || 1)).toString()))
      .toString()
  )
  const [loadingToken, setLoadingToken] = useState(false)
  const [invalidTokenAddress, setInvalidTokenAddress] = useState(false)

  const chains = isProduction ? getMainnetChains() : getTestnetChains()

  const debouncedTokenAddress = useDebounce(props.tokenInfo.tokenAddress, 300)

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

  const setChain = (chain: SupportedChain) => {
    const info = props.tokenInfo
    info.chain = chain
    props.onChange(info, props.position)
  }

  const setTokenAddress = (address: string) => {
    const info = props.tokenInfo
    info.tokenAddress = address
    props.onChange(info, props.position)
  }

  const checkTokenInfo = async () => {
    setLoadingToken(true)
    setInvalidTokenAddress(false)
    if (isValidEVMAddress(props.tokenInfo.tokenAddress)) {
      const info = await getTokenInfo(
        props.tokenInfo.tokenAddress,
        props.tokenInfo.chain
      )
      let tokenInfo: TokenGateElement = {
        type: TokenInterface.ERC20,
        tokenName: '',
        tokenSymbol: '',
        tokenAddress: props.tokenInfo.tokenAddress,
        chain: props.tokenInfo.chain,
        minimumBalance: props.tokenInfo.minimumBalance,
      }
      if (info) {
        tokenInfo = {
          ...info,
          minimumBalance: props.tokenInfo.minimumBalance,
        }
      } else if (props.tokenInfo.tokenAddress) {
        setInvalidTokenAddress(true)
      }
      props.onChange(tokenInfo, props.position)
    }
    setLoadingToken(false)
  }
  useEffect(() => {
    !props.tokenInfo.tokenName && checkTokenInfo()
  }, [debouncedTokenAddress])

  return (
    <Flex
      position="relative"
      borderRadius={6}
      borderColor={props.tokenInfo.tokenName ? 'orange.500' : 'gray.500'}
      borderWidth={2}
    >
      {props.tokenInfo.tokenName && (
        <Text
          borderBottomRightRadius={4}
          borderTopLeftRadius={4}
          position="absolute"
          left={0}
          top={0}
          p={2}
          backgroundColor="orange.500"
          color="white"
        >
          {props.tokenInfo.type}
        </Text>
      )}
      {!props.tokenInfo.tokenName && (
        <Text position="absolute" left={2} top={0} p={2}>
          Please add token information
        </Text>
      )}
      <Box position="absolute" right={0} top={0}>
        <IconButton
          aria-label="close"
          isRound
          variant="ghost"
          icon={<CloseIcon />}
          onClick={() => props.onRemove(props.position)}
        />
      </Box>
      <Box p={4} mt={8}>
        <FormControl>
          <FormLabel>Chain</FormLabel>
          <Select
            value={props.tokenInfo.chain}
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
              value={props.tokenInfo.tokenAddress}
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
              value={props.tokenInfo?.tokenName}
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
              value={props.tokenInfo?.tokenSymbol}
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
              disabled={props.tokenInfo.tokenName === ''}
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
      </Box>
    </Flex>
  )
}
