import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  FormControl,
  FormHelperText,
  HStack,
  Input,
  RadioProps,
  Text,
  useRadio,
  useRadioGroup,
  UseRadioProps,
} from '@chakra-ui/react'
import { useState } from 'react'

interface IProps {
  isDialogOpen: boolean
  cancelDialogRef: React.MutableRefObject<any>
  onDialogClose: () => void
}

const availableChains: Array<string> = [
  'Metis',
  'Polygon',
  'Arbitrum',
  'Harmony',
]

// List of tokens we support for the following chains: Metis, Polygon, Arbitrum, Harmony
const availableMetisTokens: Array<string> = ['DAI', 'USDC', 'METIS']

const availablePolygonTokens: Array<string> = ['DAI', 'USDC', 'MATIC']

const availableArbitrumTokens: Array<string> = ['DAI', 'USDC']

const availableHarmonyTokens: Array<string> = ['DAI', 'USDC', 'ONE']

const RadioCard: React.FC<UseRadioProps | undefined> = props => {
  const { getInputProps, getCheckboxProps } = useRadio(props)

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="md"
        _checked={{
          bg: 'gray.100',
        }}
        px={5}
        py={3}
      >
        {props.children}
      </Box>
    </Box>
  )
}

const SubscriptionDialog: React.FC<IProps> = ({
  isDialogOpen,
  cancelDialogRef,
  onDialogClose,
}) => {
  const [bookingLink, setBookingLink] = useState<string | undefined>(undefined)
  const [currentChain, setCurrentChain] = useState<string>('Metis')

  const { getRootProps: _, getRadioProps: getChainsRadioProps } = useRadioGroup(
    {
      name: 'chain',
      defaultValue: 'Metis',
      onChange: value => setCurrentChain(value),
    }
  )

  const { getRootProps, getRadioProps: getTokensRadioProps } = useRadioGroup({
    name: 'token',
    defaultValue: 'DAI',
    onChange: console.log,
  })

  return (
    <AlertDialog
      size="2xl"
      isOpen={isDialogOpen}
      leastDestructiveRef={cancelDialogRef}
      onClose={onDialogClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Subscribe to Pro
          </AlertDialogHeader>

          <AlertDialogBody>
            <FormControl>
              <Text pt={2}>Booking link</Text>
              <Input
                value={bookingLink}
                type="text"
                placeholder="your_custom_link"
                onChange={e =>
                  setBookingLink(
                    e.target.value.replace(/ /g, '').replace(/[^\w\s]/gi, '')
                  )
                }
              />
              <Text color="gray.500" pt={2} fontSize="14px">
                This is the link you will share with others to schedule
                meetings, instead of your wallet address. It can&apos;t contain
                spaces or special characters. You can change it later on. You
                public calendar page will be accessible at
                https://meetwihtwallet.xyz/
                {bookingLink ? bookingLink : 'your_custom_link'}
              </Text>
            </FormControl>
            <Text pt={5} pb={5}>
              Which chain do you want to pay from?
            </Text>
            <Text color="gray.500" fontSize="14px">
              This is just the chain where your subscription will live and be
              paid from. This choice will not limit other features in the
              platform (for example, where you can accept payments for meetings
              from).
            </Text>
            <HStack justify="center" pt={5}>
              {availableChains.map(value => {
                const radio = getChainsRadioProps({ value })
                return (
                  <RadioCard key={value} {...radio}>
                    {value}
                  </RadioCard>
                )
              })}
            </HStack>
            <Text pt={5} pb={5}>
              Which token do you want to pay with?
            </Text>
            <HStack justify="center">
              {currentChain === 'Metis'
                ? availableMetisTokens.map(value => {
                    const radio = getTokensRadioProps({ value })
                    return (
                      <RadioCard key={value} {...radio}>
                        {value}
                      </RadioCard>
                    )
                  })
                : currentChain === 'Polygon'
                ? availablePolygonTokens.map(value => {
                    const radio = getTokensRadioProps({ value })
                    return (
                      <RadioCard key={value} {...radio}>
                        {value}
                      </RadioCard>
                    )
                  })
                : currentChain === 'Arbitrum'
                ? availableArbitrumTokens.map(value => {
                    const radio = getTokensRadioProps({ value })
                    return (
                      <RadioCard key={value} {...radio}>
                        {value}
                      </RadioCard>
                    )
                  })
                : currentChain === 'Harmony'
                ? availableHarmonyTokens.map(value => {
                    const radio = getTokensRadioProps({ value })
                    return (
                      <RadioCard key={value} {...radio}>
                        {value}
                      </RadioCard>
                    )
                  })
                : null}
            </HStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button color="black" ref={cancelDialogRef} onClick={onDialogClose}>
              Cancel
            </Button>
            <Button colorScheme="orange" onClick={onDialogClose} ml={3}>
              Subscribe
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

export default SubscriptionDialog
