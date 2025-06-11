import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Button,
  FormControl,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { ConnectedCalendarCore } from '@meta/CalendarConnections'
import { getAccountDomainUrl } from '@utils/calendar_manager'
import { appUrl } from '@utils/constants'
import {
  CryptoNetworkForCardSettlementOptions,
  DurationOptions,
  isPaymentChannel,
  isPlanType,
  isSessionType,
  MinNoticeTimeOptions,
  PaymentChannel,
  PaymentChannelOptions,
  PlanType,
  PlanTypeOptions,
  SessionType,
  SessionTypeOptions,
} from '@utils/constants/meeting-types'
import {
  fullWidthStyle,
  noClearCustomSelectComponent,
  Option,
} from '@utils/constants/select'
import { convertMinutes } from '@utils/generic_utils'
import useAccountContext from '@utils/hooks/useAccountContext'
import { Select as ChakraSelect } from 'chakra-react-select'
import React, { FC, useId, useState } from 'react'

interface IProps {
  onClose: () => void
  isOpen: boolean
  calendars: ConnectedCalendarCore[]
}
const CreateMeetingTypeModal: FC<IProps> = props => {
  const currentAccount = useAccountContext()
  const [sessionType, setSessionType] = React.useState<Option<SessionType>>(
    SessionTypeOptions[0]
  )
  const [planType, setPlanType] = React.useState<Option<PlanType>>(
    PlanTypeOptions[0]
  )
  const [paymentChannel, setPaymentChannel] = React.useState<
    Option<PaymentChannel>
  >(PaymentChannelOptions(currentAccount?.address || '')[0])
  const [availabilityBlock, setAvailabilityBlock] = React.useState<
    Option<string>
  >({
    value: 'default',
    label: 'Default',
  })
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [customBookingLink, setCustomBookingLink] = React.useState('')
  const [minAdvanceTime, setMinAdvanceTime] = useState(convertMinutes(60 * 24))
  const [duration, setDuration] = useState<Option<number>>(DurationOptions[1])
  const [calendars, setCalendars] = useState<Option<string>[]>([])
  const handleSessionChange = (value: unknown) => {
    const sessionType = value as Option<SessionType>
    if (isSessionType(sessionType.value)) {
      setSessionType(sessionType)
    }
  }
  const handleAvailabilityBlockChangeChange = (value: unknown) => {
    const availability = value as Option<string>
    setAvailabilityBlock(availability)
  }
  const handlePlanTypeChange = (value: unknown) => {
    const sessionType = value as Option<PlanType>
    if (isPlanType(sessionType.value)) {
      setPlanType(sessionType)
    }
  }
  const handlePaymentChannelChange = (value: unknown) => {
    const paymentChannel = value as Option<PaymentChannel>
    if (isPaymentChannel(paymentChannel.value)) {
      setPaymentChannel(paymentChannel)
    }
  }
  const handleCalendarChange = (value: unknown) => {
    const selectedCalendars = value as Option<string>[]
    setCalendars(selectedCalendars)
  }
  const handleDurationChange = (value: unknown) => {
    const selectedDuration = value as Option<number>
    setDuration(selectedDuration)
  }
  const domainUrl = getAccountDomainUrl(currentAccount)
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      size={'xl'}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent p="6" bg="neutral.900">
        <ModalHeader p={'0'}>
          <ModalCloseButton left={6} w={'fit-content'}>
            <HStack color={'primary.400'}>
              <ArrowBackIcon w={6} h={6} />
              <Text fontSize={16}>Back</Text>
            </HStack>
          </ModalCloseButton>
          <Heading fontSize={'24px'} mt={4} fontWeight={700}>
            New Session and Plan
          </Heading>
        </ModalHeader>
        <ModalBody p={'0'}>
          <Text color={'neutral.400'}>Create new session type</Text>
          <VStack mt={4} alignItems={'flex-start'} spacing={4}>
            <VStack
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
            >
              <Text fontSize={'16px'}>Session Type</Text>
              <ChakraSelect
                value={sessionType}
                colorScheme="primary"
                onChange={handleSessionChange}
                // eslint-disable-next-line tailwindcss/no-custom-classname
                className="noLeftBorder timezone-select"
                options={SessionTypeOptions}
                components={noClearCustomSelectComponent}
                chakraStyles={{
                  ...fullWidthStyle,
                  container: provided => ({
                    ...provided,
                    borderColor: 'inherit',
                    borderRadius: 'md',
                    maxW: '100%',
                    display: 'block',
                  }),
                }}
              />
            </VStack>
            <VStack
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
            >
              <Text fontSize={'16px'}>Title</Text>
              <Input
                placeholder="What do you call this session?"
                borderColor="neutral.400"
                width={'max-content'}
                w="100%"
                errorBorderColor="red.500"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </VStack>
            <VStack
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
            >
              <Text fontSize={'16px'}>Description</Text>
              <Textarea
                placeholder="Add an option description to the session type."
                borderColor="neutral.400"
                width={'max-content'}
                w="100%"
                errorBorderColor="red.500"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </VStack>
            <VStack
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
            >
              <Text fontSize={'16px'}>Custom Booking Link</Text>
              <InputGroup>
                <InputLeftAddon
                  pointerEvents="none"
                  borderRightColor="transparent !important"
                  bgColor="transparent"
                  pr={0}
                  maxW={'70%'}
                  isTruncated
                >
                  <HStack opacity="0.5" bg={'none'} gap={0}>
                    <Text>{`${appUrl}/`}</Text>
                    <Text maxW={55} isTruncated m={0}>
                      {domainUrl?.slice(0, domainUrl.length - 4)}
                    </Text>
                    <Text>{domainUrl?.slice(domainUrl.length - 4)}/</Text>
                  </HStack>
                </InputLeftAddon>
                <Input
                  pl={0}
                  borderLeftColor="transparent"
                  value={customBookingLink}
                  type="text"
                  placeholder={'your-booking-link'}
                  onChange={e => setCustomBookingLink(e.target.value)}
                />
              </InputGroup>
            </VStack>
            <VStack
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
            >
              <Text fontSize={'16px'}>Availability block</Text>
              <ChakraSelect
                value={availabilityBlock}
                onChange={handleAvailabilityBlockChangeChange}
                // eslint-disable-next-line tailwindcss/no-custom-classname
                className="noLeftBorder timezone-select"
                options={[
                  {
                    vale: 'default',
                    label: 'Default',
                  },
                ]}
                isMulti
                tagVariant={'solid'}
                components={noClearCustomSelectComponent}
                colorScheme="black"
                chakraStyles={{
                  container: provided => ({
                    ...provided,
                    border: '1px solid',
                    borderTopColor: 'currentColor',
                    borderLeftColor: 'currentColor',
                    borderRightColor: 'currentColor',
                    borderBottomColor: 'currentColor',
                    borderColor: 'inherit',
                    borderRadius: 'md',
                    maxW: '100%',
                    display: 'block',
                    w: '100%',
                  }),

                  placeholder: provided => ({
                    ...provided,
                    textAlign: 'left',
                  }),
                }}
              />
              <Link
                color={'primary.400'}
                href="/dashboard/schedule"
                borderBottom="1px solid"
                pb={-4}
              >
                Edit this availability block <ArrowForwardIcon />
              </Link>
            </VStack>
            <VStack
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
            >
              <Text fontSize={'16px'}>Calendar to Add event to</Text>
              <ChakraSelect
                value={calendars}
                onChange={handleCalendarChange}
                // eslint-disable-next-line tailwindcss/no-custom-classname
                className="noLeftBorder timezone-select"
                options={
                  props?.calendars?.map(calendar => ({
                    value: calendar.id,
                    label: calendar.email,
                  })) || []
                }
                isMulti
                tagVariant={'solid'}
                components={noClearCustomSelectComponent}
                colorScheme="black"
                chakraStyles={{
                  container: provided => ({
                    ...provided,
                    border: '1px solid',
                    borderTopColor: 'currentColor',
                    borderLeftColor: 'currentColor',
                    borderRightColor: 'currentColor',
                    borderBottomColor: 'currentColor',
                    borderColor: 'inherit',
                    borderRadius: 'md',
                    maxW: '100%',
                    display: 'block',
                    w: '100%',
                  }),

                  placeholder: provided => ({
                    ...provided,
                    textAlign: 'left',
                  }),
                }}
              />
            </VStack>
            <HStack w={'100%'} gap={5}>
              <FormControl w={'35%'}>
                <Text mb={1}>Session Duration</Text>
                <ChakraSelect
                  value={duration}
                  colorScheme="primary"
                  onChange={handleDurationChange}
                  options={DurationOptions}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="date-select"
                  components={noClearCustomSelectComponent}
                  chakraStyles={fullWidthStyle}
                />
              </FormControl>
              <FormControl w={'65%'}>
                <Text mb={1}>Minimum Notice Time</Text>
                <HStack w={'100%'} alignItems="center">
                  <Input
                    width="50%"
                    type="number"
                    value={minAdvanceTime.amount}
                    onChange={e => {
                      setMinAdvanceTime({
                        amount: Number(e.target.value),
                        type: minAdvanceTime.type,
                        isEmpty: false,
                      })
                    }}
                  />
                  <ChakraSelect
                    value={minAdvanceTime.type}
                    colorScheme="primary"
                    onChange={value =>
                      setMinAdvanceTime({
                        amount: minAdvanceTime.amount,
                        type: String(value),
                        isEmpty: false,
                      })
                    }
                    options={MinNoticeTimeOptions}
                    // eslint-disable-next-line tailwindcss/no-custom-classname
                    className="date-select"
                    components={noClearCustomSelectComponent}
                    chakraStyles={{
                      container: provided => ({
                        ...provided,
                        borderColor: 'inherit',
                        borderRadius: 'md',
                        display: 'block',
                        width: '50% !important',
                        height: '100% !important',
                      }),
                      placeholder: provided => ({
                        ...provided,
                        textAlign: 'left',
                      }),
                      input: provided => ({
                        ...provided,
                        textAlign: 'left',
                      }),
                      control: provided => ({
                        ...provided,
                        textAlign: 'left',
                      }),
                    }}
                  />
                </HStack>
              </FormControl>
            </HStack>
            <VStack mt={1} width={'100%'} gap={4}>
              <VStack w={'100%'} alignItems="flex-start" gap={1}>
                <Heading size={'sm'}>Plan & Package Settings</Heading>
                <Text color={'neutral.400'} mt={0}>
                  Setup your plan for the schedulers
                </Text>
              </VStack>
              <VStack
                width={'100%'}
                justifyContent={'space-between'}
                alignItems="flex-start"
              >
                <Text fontSize={'16px'}>Plan Type</Text>
                <ChakraSelect
                  value={planType}
                  colorScheme="primary"
                  onChange={handleSessionChange}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="noLeftBorder timezone-select"
                  options={PlanTypeOptions}
                  components={noClearCustomSelectComponent}
                  chakraStyles={fullWidthStyle}
                />
              </VStack>
              <VStack
                width={'100%'}
                justifyContent={'space-between'}
                alignItems="flex-start"
              >
                <Text fontSize={'16px'}>
                  Plan maximum booking slot per person
                </Text>
                <Input
                  placeholder="What is the maximum booking slot per person?"
                  borderColor="neutral.400"
                  width={'max-content'}
                  w="100%"
                  errorBorderColor="red.500"
                  type={'number'}
                />
              </VStack>
              <VStack
                width={'100%'}
                justifyContent={'space-between'}
                alignItems="flex-start"
              >
                <Text fontSize={'16px'}>Price per session</Text>
                <InputGroup>
                  <Input
                    placeholder="What is the maximum booking slot per person?"
                    borderColor="neutral.400"
                    width={'max-content'}
                    w="100%"
                    errorBorderColor="red.500"
                    type={'number'}
                  />
                  <InputRightElement pr={3}>USD</InputRightElement>
                </InputGroup>
              </VStack>
              <VStack
                width={'100%'}
                justifyContent={'space-between'}
                alignItems="flex-start"
              >
                <Text fontSize={'16px'}>Receive payment with</Text>
                <ChakraSelect
                  value={paymentChannel}
                  colorScheme="primary"
                  onChange={handlePaymentChannelChange}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="noLeftBorder timezone-select"
                  options={PaymentChannelOptions(currentAccount?.address || '')}
                  components={noClearCustomSelectComponent}
                  chakraStyles={fullWidthStyle}
                />
              </VStack>
              <VStack
                width={'100%'}
                justifyContent={'space-between'}
                alignItems="flex-start"
              >
                <Text fontSize={'16px'}>
                  Crypto network for card payment settlement
                </Text>
                <ChakraSelect
                  value={paymentChannel}
                  colorScheme="primary"
                  onChange={handlePaymentChannelChange}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="noLeftBorder timezone-select"
                  options={CryptoNetworkForCardSettlementOptions}
                  components={noClearCustomSelectComponent}
                  chakraStyles={fullWidthStyle}
                />
              </VStack>
            </VStack>
            <HStack justifyContent="space-between" w="100%" mt={3}>
              <Button colorScheme="primary" onClick={props.onClose}>
                Create Session Type
              </Button>
              <Button
                variant="outline"
                colorScheme="primary"
                onClick={props.onClose}
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default CreateMeetingTypeModal
