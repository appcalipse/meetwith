import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Switch,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { ConnectedCalendarCore } from '@meta/CalendarConnections'
import { CreateMeetingTypeRequest } from '@meta/Requests'
import { saveMeetingType, updateMeetingType } from '@utils/api_helper'
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
import { MeetingSlugAlreadyExists } from '@utils/errors'
import {
  convertMinutes,
  getSlugFromText,
  renderProviderName,
} from '@utils/generic_utils'
import {
  createMeetingSchema,
  ErrorAction,
  errorReducer,
  ErrorState,
  fieldKey,
  PlanKeys,
  SchemaKeys,
  validateField,
} from '@utils/schemas'
import { Select as ChakraSelect } from 'chakra-react-select'
import React, { FC, Reducer, useMemo, useState } from 'react'
import { z } from 'zod'

import useAccountContext from '@/hooks/useAccountContext'
import { MeetingType } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import { MeetingProvider } from '@/types/Meeting'
interface IProps {
  onClose: () => void
  isOpen: boolean
  isCalendarLoading: boolean
  calendarOptions: Array<ConnectedCalendarCore>
  refetch: () => Promise<void>
  onDelete: () => void
  initialValues?: Partial<MeetingType> | null
  canDelete: boolean
  availabilityBlocks: Array<AvailabilityBlock>
  isAvailabilityLoading: boolean
}

const MeetingTypeModal: FC<IProps> = props => {
  const [errors, dispatchErrors] = React.useReducer<
    Reducer<ErrorState<SchemaKeys, 'plan', PlanKeys>, ErrorAction<fieldKey>>
  >(errorReducer, {})
  const currentAccount = useAccountContext()
  const [sessionType, setSessionType] = React.useState<Option<SessionType>>(
    SessionTypeOptions.find(
      option => option.value === props.initialValues?.type
    ) || SessionTypeOptions[0]
  )
  const [planType, setPlanType] = React.useState<Option<PlanType>>(
    PlanTypeOptions.find(
      option => option.value === props.initialValues?.plan?.type
    ) || PlanTypeOptions[0]
  )
  const channelOptions = PaymentChannelOptions(currentAccount?.address || '')
  const [paymentChannel, setPaymentChannel] = React.useState<
    Option<PaymentChannel>
  >(
    channelOptions.find(
      option => option.value === props.initialValues?.plan?.payment_channel
    ) || channelOptions[0]
  )
  const [availabilityBlock, setAvailabilityBlock] = React.useState<
    Array<Option<string>>
  >(
    props?.initialValues?.availabilities?.map(availability => ({
      value: availability.id,
      label: availability.title,
    })) || []
  )
  const [cryptoNetwork, setCryptoNetwork] = useState<Option<number>>(
    CryptoNetworkForCardSettlementOptions.find(
      option => option.value === props.initialValues?.plan?.default_chain_id
    ) || CryptoNetworkForCardSettlementOptions[0]
  )
  const [title, setTitle] = React.useState(props.initialValues?.title || '')
  const [description, setDescription] = React.useState(
    props.initialValues?.description
  )
  const [customBookingLink, setCustomBookingLink] = React.useState(
    props.initialValues?.slug || ''
  )
  const [minAdvanceTime, setMinAdvanceTime] = useState(
    convertMinutes(props.initialValues?.min_notice_minutes || 60 * 24)
  )
  const [minAdvanceType, setMinAdvanceType] = useState<Option<string>>(
    MinNoticeTimeOptions.find(
      val =>
        val.value.toLowerCase() ===
        convertMinutes(props.initialValues?.min_notice_minutes || 60 * 24).type
    ) || MinNoticeTimeOptions[0]
  )
  const [duration, setDuration] = useState<Option<number>>(
    DurationOptions.find(
      option => option.value === props.initialValues?.duration_minutes
    ) || DurationOptions[1]
  )
  const [calendars, setCalendars] = useState<Option<number>[]>(
    props.initialValues?.calendars?.map(calendar => ({
      value: calendar.id,
      label: calendar.email,
    })) || []
  )
  const [noOfSlot, setNoOfSlot] = useState<string>(
    props?.initialValues?.plan?.no_of_slot?.toString() || ''
  )
  const [pricePerSession, setPricePerSession] = useState<string>(
    props?.initialValues?.plan?.price_per_slot?.toString() || ''
  )
  const [customAddress, setCustomAddress] = useState<string>(
    props.initialValues?.plan?.payment_channel === PaymentChannel.CUSTOM_ADDRESS
      ? props?.initialValues?.plan?.payment_address || ''
      : ''
  )
  const [selectedProviders, setSelectedProviders] = useState<
    Array<MeetingProvider>
  >(
    props?.initialValues?.meeting_platforms ||
      currentAccount?.preferences?.meetingProviders ||
      []
  )
  const [isLoading, setIsLoading] = useState(false)
  const bgColor = useColorModeValue('white', 'neutral.900')
  const PROVIDERS = useMemo(() => {
    return [
      MeetingProvider.GOOGLE_MEET,
      MeetingProvider.ZOOM,
      MeetingProvider.HUDDLE,
      MeetingProvider.JITSI_MEET,
    ]
  }, [])
  const [customLink, setCustomLink] = useState<string>(
    props.initialValues?.custom_link || ''
  )
  const [fixedLink, setFixedLink] = useState<boolean>(
    props.initialValues?.fixed_link || false
  )
  const toast = useToast()
  // TODO: validate data with zod.
  const handleSessionChange = (value: unknown) => {
    const sessionType = value as Option<SessionType>
    if (isSessionType(sessionType.value)) {
      setSessionType(sessionType)
    }
  }
  const handleAvailabilityBlockChangeChange = (value: unknown) => {
    const availability = value as Array<Option<string>>
    setAvailabilityBlock(availability)
  }
  const handlePlanTypeChange = (value: unknown) => {
    const sessionType = value as Option<PlanType>
    if (isPlanType(sessionType.value)) {
      setPlanType(sessionType)
    }
  }
  const handleCryptoNetworkChange = (value: unknown) => {
    const cryptoNetwork = value as Option<number>
    setCryptoNetwork(cryptoNetwork)
  }
  const handlePaymentChannelChange = (value: unknown) => {
    const paymentChannel = value as Option<PaymentChannel>
    if (isPaymentChannel(paymentChannel.value)) {
      setPaymentChannel(paymentChannel)
    }
  }
  const handleCalendarChange = (value: unknown) => {
    const selectedCalendars = value as Option<number>[]
    setCalendars(selectedCalendars)
  }
  const handleDurationChange = (value: unknown) => {
    const selectedDuration = value as Option<number>
    setDuration(selectedDuration)
  }
  const handleMinNoticeTypeChange = (value: unknown) => {
    const newValue = value as Option<string>
    setMinAdvanceTime({
      amount: minAdvanceTime.amount,
      type: String(newValue.value),
      isEmpty: false,
    })
    setMinAdvanceType(newValue)
  }
  const domainUrl = getAccountDomainUrl(currentAccount)
  const handleMeetingPlatformChange = async (
    value: MeetingProvider | 'ALL' | 'RESET'
  ) => {
    setSelectedProviders(prevProviders => {
      switch (value) {
        case 'ALL':
          return [...PROVIDERS]

        case 'RESET':
          return []

        default:
          return prevProviders.includes(value)
            ? prevProviders.filter(provider => provider !== value)
            : [...prevProviders, value]
      }
    })
  }
  const handleSave = async () => {
    setIsLoading(true)
    dispatchErrors({
      type: 'CLEAR_ALL',
    })
    if (!props.initialValues) {
      setIsLoading(false)
      return
    }
    const payload: CreateMeetingTypeRequest = {
      type: sessionType.value,
      slug: customBookingLink,
      title,
      duration_minutes: duration.value,
      min_notice_minutes:
        minAdvanceTime.amount *
        (minAdvanceTime.type === 'minutes'
          ? 1
          : minAdvanceTime.type === 'hours'
          ? 60
          : 60 * 24),
      calendars: calendars.map(c => c.value),
      availability_ids: availabilityBlock.map(val => val.value),
      description,
      custom_link: customLink,
      fixed_link: fixedLink,
      // TODO: validate backend request data
      meeting_platforms: selectedProviders,
      plan:
        sessionType.value === SessionType.FREE
          ? undefined
          : {
              type: planType.value,
              no_of_slot:
                planType.value === PlanType.SESSIONS ? Number(noOfSlot) : 1,
              price_per_slot: Number(pricePerSession),
              payment_channel: paymentChannel.value,
              payment_address:
                paymentChannel.value === PaymentChannel.CUSTOM_ADDRESS
                  ? customAddress
                  : currentAccount?.address || '',
              crypto_network: cryptoNetwork.value,
            },
    }
    try {
      createMeetingSchema.parse(payload) // Validate using the Zod schema
      // If valid, submit the form (e.g. API call)
      if (props.initialValues.id) {
        await updateMeetingType({ ...payload, id: props.initialValues.id })
        toast({
          title: 'Session type updated successfully',
          description: 'Your session type has been updated.',
          status: 'success',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      } else {
        await saveMeetingType(payload)
        toast({
          title: 'Session type created successfully',
          description: 'Your session type has been created.',
          status: 'success',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
      await props.refetch()
      props.onClose()
    } catch (e) {
      if (e instanceof z.ZodError) {
        e.errors.forEach(err => {
          dispatchErrors({
            type: 'SET_ERROR',
            field: err.path.join('.') as SchemaKeys,
            message: err.message,
          })
        })
      } else if (e instanceof MeetingSlugAlreadyExists) {
        toast({
          title: 'Slug already exists',
          description: 'Please choose a different booking link.',
          status: 'error',
          duration: 5000,
          position: 'top',
          isClosable: true,
        })
      }
    }
    setIsLoading(false)
  }
  const handleBlur = (field: fieldKey) => {
    let value
    switch (field) {
      case 'title':
        value = title
        break
      case 'description':
        value = description
        break
      case 'slug':
        value = customBookingLink
        break
      case 'type':
        value = sessionType.value
        break
      case 'availability_ids':
        value = availabilityBlock.map(val => val.value)
        break
      case 'calendars':
        value = calendars.map(c => c.value)
        break
      case 'duration_minutes':
        value = duration.value
        break
      case 'min_notice_minutes':
        value =
          minAdvanceTime.amount *
          (minAdvanceTime.type === 'minutes'
            ? 1
            : minAdvanceTime.type === 'hours'
            ? 60
            : 60 * 24)
        break
      case 'fixed_link':
        value = fixedLink
        break
      case 'custom_link':
        value = customLink
        break
      case 'plan.type':
        value = planType.value
        break
      case 'plan.no_of_slot':
        value = Number(noOfSlot)
        break
      case 'plan.price_per_slot':
        value = Number(pricePerSession)
        break
      case 'plan.payment_channel':
        value = paymentChannel.value
        break
      case 'plan.payment_address':
        value =
          paymentChannel.value === PaymentChannel.CUSTOM_ADDRESS
            ? customAddress
            : currentAccount?.address || ''
        break
      case 'plan.crypto_network':
        value = cryptoNetwork.value
        break
      default:
        value = undefined
        break
    }

    const { isValid, error } = validateField(field, value)

    if (!isValid && error) {
      dispatchErrors({
        type: 'SET_ERROR',
        field,
        message: error,
      })
    } else {
      dispatchErrors({
        type: 'CLEAR_ERROR',
        field,
      })
    }
  }
  const handleClose = () => {
    dispatchErrors({
      type: 'CLEAR_ALL',
    })
    props.onClose()
  }
  const handleDelete = async () => {
    if (!props.canDelete) {
      toast({
        title: 'Cannot delete',
        description: 'You need to have at least one session type.',
        status: 'error',
        duration: 5000,
        position: 'top',
        isClosable: true,
      })
      return
    }
    if (props.initialValues) props.onDelete()
  }
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      blockScrollOnMount={false}
      size={'xl'}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent p="6" bg="neutral.900">
        <ModalHeader p={'0'}>
          <HStack
            w={'100%'}
            justifyContent="space-between"
            position="relative"
            py={2}
          >
            <HStack
              color={'primary.400'}
              onClick={handleClose}
              w={'fit-content'}
              cursor="pointer"
              role={'button'}
            >
              <ArrowBackIcon w={6} h={6} />
              <Text fontSize={16}>Back</Text>
            </HStack>
            {props.initialValues?.id && (
              <Button
                w={'fit-content'}
                colorScheme="orangeButton"
                variant="link"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </HStack>
          <Heading fontSize={'24px'} mt={6} fontWeight={700}>
            {props?.initialValues?.id
              ? 'New Session and Plan'
              : 'Create Session and Plan'}
          </Heading>
        </ModalHeader>
        <ModalBody p={'0'} w="100%">
          <Text color={'neutral.400'}>
            {props?.initialValues?.id
              ? 'Edit session type'
              : 'Create new session type'}
          </Text>
          <VStack mt={4} alignItems={'flex-start'} spacing={4} w="100%">
            <FormControl
              gap={1}
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
              isInvalid={!!errors.type}
              isDisabled
            >
              <FormLabel fontSize={'16px'}>Session Type</FormLabel>
              <ChakraSelect
                isDisabled={!!props.initialValues?.id}
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
                onBlur={() => handleBlur('type')}
              />
            </FormControl>
            <FormControl
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
              isInvalid={!!errors.title}
            >
              <FormLabel fontSize={'16px'}>Title</FormLabel>
              <Input
                placeholder="What do you call this session?"
                borderColor="neutral.400"
                width={'max-content'}
                w="100%"
                errorBorderColor="red.500"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => {
                  handleBlur('title')
                  if (!customBookingLink) {
                    setCustomBookingLink(getSlugFromText(title))
                    handleBlur('slug')
                  }
                }}
              />
              {!!errors.title && (
                <FormErrorMessage>{errors.title}</FormErrorMessage>
              )}
            </FormControl>
            <FormControl
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
              isInvalid={!!errors.description}
            >
              <FormLabel fontSize={'16px'}>Description</FormLabel>
              <Textarea
                placeholder="Add an option description to the session type."
                borderColor="neutral.400"
                width={'max-content'}
                w="100%"
                errorBorderColor="red.500"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={() => handleBlur('description')}
              />
              {!!errors.description && (
                <FormErrorMessage>{errors.description}</FormErrorMessage>
              )}
            </FormControl>
            <FormControl
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
              isInvalid={!!errors.slug}
            >
              <FormLabel fontSize={'16px'}>Custom Booking Link</FormLabel>
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
                  onChange={e =>
                    setCustomBookingLink(e.target.value?.replace(' ', '-'))
                  }
                  onBlur={() => handleBlur('slug')}
                />
              </InputGroup>
              {!!errors.slug && (
                <FormErrorMessage>{errors.slug}</FormErrorMessage>
              )}
            </FormControl>
            <FormControl
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
              isInvalid={!!errors.availability_ids}
            >
              <FormLabel fontSize={'16px'}>Availability block</FormLabel>
              {props.isAvailabilityLoading ? (
                <Spinner />
              ) : (
                <ChakraSelect
                  value={availabilityBlock}
                  onChange={handleAvailabilityBlockChangeChange}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="noLeftBorder timezone-select"
                  options={
                    props?.availabilityBlocks?.map(availability => ({
                      value: availability.id,
                      label: availability.title,
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
                  onBlur={() => handleBlur('availability_ids')}
                />
              )}
              <Link
                color={'primary.400'}
                href="/dashboard/schedule"
                borderBottom="1px solid"
                pb={-4}
              >
                Edit this availability block <ArrowForwardIcon />
              </Link>
              {!!errors.availability_ids && (
                <FormErrorMessage>{errors.availability_ids}</FormErrorMessage>
              )}
            </FormControl>
            <FormControl
              width={'100%'}
              justifyContent={'space-between'}
              alignItems="flex-start"
              isInvalid={!!errors.calendars}
            >
              <FormLabel fontSize={'16px'}>Calendar to Add event to</FormLabel>
              {props.isCalendarLoading ? (
                <Spinner />
              ) : (
                <ChakraSelect
                  value={calendars}
                  onChange={handleCalendarChange}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="noLeftBorder timezone-select"
                  options={
                    props?.calendarOptions?.map(calendar => ({
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
                  onBlur={() => handleBlur('calendars')}
                />
              )}
              {!!errors.calendars && (
                <FormErrorMessage>{errors.calendars}</FormErrorMessage>
              )}
            </FormControl>
            <HStack w={'100%'} gap={5}>
              <FormControl w={'35%'} isInvalid={!!errors.duration_minutes}>
                <FormLabel mb={1}>Session Duration</FormLabel>
                <ChakraSelect
                  value={duration}
                  colorScheme="primary"
                  onChange={handleDurationChange}
                  options={DurationOptions}
                  // eslint-disable-next-line tailwindcss/no-custom-classname
                  className="date-select"
                  components={noClearCustomSelectComponent}
                  chakraStyles={fullWidthStyle}
                  onBlur={() => handleBlur('duration_minutes')}
                />
                {!!errors.duration_minutes && (
                  <FormErrorMessage>{errors.duration_minutes}</FormErrorMessage>
                )}
              </FormControl>
              <FormControl w={'65%'} isInvalid={!!errors.min_notice_minutes}>
                <FormLabel mb={1}>Minimum Notice Time</FormLabel>
                <HStack w={'100%'} alignItems="center">
                  <FormControl
                    width="50%"
                    isInvalid={!!errors.min_notice_minutes}
                  >
                    <Input
                      width="100%"
                      type="number"
                      value={minAdvanceTime.amount}
                      onChange={e => {
                        setMinAdvanceTime({
                          amount: Number(e.target.value),
                          type: minAdvanceTime.type,
                          isEmpty: false,
                        })
                      }}
                      onBlur={() => handleBlur('min_notice_minutes')}
                    />
                    {!!errors.min_notice_minutes && (
                      <FormErrorMessage>
                        {errors.min_notice_minutes}
                      </FormErrorMessage>
                    )}
                  </FormControl>
                  <FormControl
                    width="50%"
                    isInvalid={!!errors.min_notice_minutes && !minAdvanceType}
                  >
                    <ChakraSelect
                      value={minAdvanceType}
                      colorScheme="primary"
                      onChange={handleMinNoticeTypeChange}
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
                          width: '100% !important',
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
                      onBlur={() => handleBlur('min_notice_minutes')}
                    />
                    {!!errors.min_notice_minutes && (
                      <FormErrorMessage>
                        Select a valid time unit
                      </FormErrorMessage>
                    )}
                  </FormControl>
                </HStack>
              </FormControl>
            </HStack>
            <VStack alignItems="flex-start" width="100%" bg={bgColor} gap={2}>
              <VStack alignItems="flex-start" width="100%">
                <Heading fontSize="2xl">Meeting Platform</Heading>
                <Text color="neutral.400" mt={2}>
                  Choose your default Meeting Platform
                </Text>
              </VStack>

              <HStack gap={2} width="100%">
                <Checkbox
                  colorScheme="primary"
                  value={
                    selectedProviders.length === PROVIDERS.length
                      ? 'RESET'
                      : 'ALL'
                  }
                  size="lg"
                  borderColor="primary.200"
                  isChecked={selectedProviders.length === PROVIDERS.length}
                  onChange={e => {
                    handleMeetingPlatformChange(
                      e.target.value as MeetingProvider
                    )
                  }}
                >
                  <Text fontWeight="600" color={'primary.200'}>
                    Select all
                  </Text>
                </Checkbox>
              </HStack>
              <HStack
                gap={2}
                justifyContent="space-between"
                flexWrap="wrap"
                width="100%"
              >
                {PROVIDERS.map(provider => (
                  <Checkbox
                    key={provider}
                    borderRadius={8}
                    mt={4}
                    flexBasis={{
                      base: '45%',
                    }}
                    borderWidth={1}
                    borderColor={
                      selectedProviders.includes(provider)
                        ? 'primary.200'
                        : 'neutral.0'
                    }
                    colorScheme="primary"
                    value={provider}
                    p={4}
                    isChecked={selectedProviders.includes(provider)}
                    onChange={e => {
                      handleMeetingPlatformChange(
                        e.target.value as MeetingProvider
                      )
                    }}
                    flexDirection="row-reverse"
                    justifyContent="space-between"
                    w="100%"
                  >
                    <Text
                      fontWeight="600"
                      color={
                        selectedProviders.includes(provider)
                          ? 'primary.200'
                          : 'neutral.0'
                      }
                      cursor="pointer"
                    >
                      {renderProviderName(provider)}
                    </Text>
                  </Checkbox>
                ))}
              </HStack>
              <FormControl
                pt={5}
                display="flex"
                flexDirection="column"
                gap={3}
                isInvalid={!!errors.custom_link}
              >
                <Text>Custom Meeting location</Text>
                <VStack gap={0} alignItems="flex-start" width="100%">
                  <Input
                    width={'345px'}
                    type="text"
                    placeholder="Google Meet, Zoom, Discord anywhere"
                    value={customLink}
                    onChange={e => setCustomLink(e.target.value)}
                    onBlur={() => handleBlur('custom_link')}
                  />
                  {!!errors.custom_link && (
                    <FormErrorMessage>{errors.custom_link}</FormErrorMessage>
                  )}
                </VStack>
                <HStack>
                  <Switch
                    colorScheme="primary"
                    size="md"
                    isChecked={fixedLink}
                    onChange={e => setFixedLink(e.target.checked)}
                  />
                  <Text>Allow scheduler to edit custom meeting location</Text>
                </HStack>
              </FormControl>
            </VStack>
            <Collapse
              in={sessionType.value === SessionType.PAID}
              animateOpacity
              style={{ width: '100%' }}
            >
              <VStack
                mt={1}
                width={'100%'}
                gap={4}
                display={
                  sessionType.value === SessionType.PAID ? 'flex' : 'none'
                }
              >
                <VStack w={'100%'} alignItems="flex-start" gap={1}>
                  <Heading size={'sm'}>Plan & Package Settings</Heading>
                  <Text color={'neutral.400'} mt={0}>
                    Setup your plan for the schedulers
                  </Text>
                </VStack>
                <FormControl
                  width={'100%'}
                  justifyContent={'space-between'}
                  alignItems="flex-start"
                  isInvalid={!!errors.plan?.type}
                >
                  <FormLabel fontSize={'16px'}>Plan Type</FormLabel>
                  <ChakraSelect
                    value={planType}
                    colorScheme="primary"
                    onChange={handlePlanTypeChange}
                    // eslint-disable-next-line tailwindcss/no-custom-classname
                    className="noLeftBorder timezone-select"
                    options={PlanTypeOptions}
                    components={noClearCustomSelectComponent}
                    chakraStyles={fullWidthStyle}
                    onBlur={() => handleBlur('plan.type')}
                  />
                  {!!errors.plan?.type && (
                    <FormErrorMessage>{errors.plan?.type}</FormErrorMessage>
                  )}
                </FormControl>
                {planType.value === PlanType.SESSIONS && (
                  <FormControl
                    width={'100%'}
                    justifyContent={'space-between'}
                    alignItems="flex-start"
                    isInvalid={!!errors.plan?.no_of_slot}
                  >
                    <FormLabel fontSize={'16px'}>
                      Plan maximum booking slot per person
                    </FormLabel>
                    <Input
                      placeholder="What is the maximum booking slot per person?"
                      borderColor="neutral.400"
                      width={'max-content'}
                      w="100%"
                      errorBorderColor="red.500"
                      type={'number'}
                      value={noOfSlot}
                      onChange={e => setNoOfSlot(e.target.value)}
                      onBlur={() => handleBlur('plan.no_of_slot')}
                    />
                    {!!errors.plan?.no_of_slot && (
                      <FormErrorMessage>
                        {errors.plan?.no_of_slot}
                      </FormErrorMessage>
                    )}
                  </FormControl>
                )}
                <FormControl
                  width={'100%'}
                  justifyContent={'space-between'}
                  alignItems="flex-start"
                  isInvalid={!!errors.plan?.price_per_slot}
                >
                  <FormLabel fontSize={'16px'}>Price per session</FormLabel>
                  <InputGroup>
                    <Input
                      placeholder="What is the price per session?"
                      borderColor="neutral.400"
                      width={'max-content'}
                      w="100%"
                      errorBorderColor="red.500"
                      type={'number'}
                      value={pricePerSession}
                      onChange={e => setPricePerSession(e.target.value)}
                      onBlur={() => handleBlur('plan.price_per_slot')}
                    />
                    <InputRightElement pr={3}>USD</InputRightElement>
                  </InputGroup>
                  {!!errors.plan?.price_per_slot && (
                    <FormErrorMessage>
                      {errors.plan?.price_per_slot}
                    </FormErrorMessage>
                  )}
                </FormControl>
                <FormControl
                  width={'100%'}
                  justifyContent={'space-between'}
                  alignItems="flex-start"
                  isInvalid={!!errors.plan?.payment_channel}
                >
                  <FormLabel fontSize={'16px'}>Receive payment with</FormLabel>
                  <ChakraSelect
                    value={paymentChannel}
                    colorScheme="primary"
                    onChange={handlePaymentChannelChange}
                    // eslint-disable-next-line tailwindcss/no-custom-classname
                    className="noLeftBorder timezone-select"
                    options={PaymentChannelOptions(
                      currentAccount?.address || ''
                    )}
                    components={noClearCustomSelectComponent}
                    chakraStyles={fullWidthStyle}
                    onBlur={() => handleBlur('plan.payment_channel')}
                  />
                  {!!errors.plan?.payment_channel && (
                    <FormErrorMessage>
                      {errors.plan?.payment_channel}
                    </FormErrorMessage>
                  )}
                </FormControl>
                {paymentChannel.value === PaymentChannel.CUSTOM_ADDRESS && (
                  <FormControl
                    width={'100%'}
                    justifyContent={'space-between'}
                    alignItems="flex-start"
                    isInvalid={!!errors.plan?.payment_address}
                  >
                    <FormLabel fontSize={'16px'}>Custom Address</FormLabel>
                    <Input
                      placeholder="Enter your custom address"
                      borderColor="neutral.400"
                      width={'max-content'}
                      w="100%"
                      errorBorderColor="red.500"
                      value={customAddress}
                      onChange={e => setCustomAddress(e.target.value)}
                      onBlur={() => handleBlur('plan.payment_address')}
                    />
                    {!!errors.plan?.payment_address && (
                      <FormErrorMessage>
                        {errors.plan?.payment_address}
                      </FormErrorMessage>
                    )}
                  </FormControl>
                )}
                <FormControl
                  width={'100%'}
                  justifyContent={'space-between'}
                  alignItems="flex-start"
                  isInvalid={!!errors.plan?.crypto_network}
                >
                  <FormLabel fontSize={'16px'}>
                    Crypto network for card payment settlement
                  </FormLabel>
                  <ChakraSelect
                    value={cryptoNetwork}
                    colorScheme="primary"
                    onChange={handleCryptoNetworkChange}
                    // eslint-disable-next-line tailwindcss/no-custom-classname
                    className="noLeftBorder timezone-select"
                    options={CryptoNetworkForCardSettlementOptions}
                    components={noClearCustomSelectComponent}
                    chakraStyles={{
                      ...fullWidthStyle,
                      menu: provided => ({
                        ...provided,
                        zIndex: 9999, // Ensure dropdown renders on top
                      }),
                    }}
                    menuPlacement="auto"
                    onBlur={() => handleBlur('plan.payment_channel')}
                  />
                  {!!errors.plan?.crypto_network && (
                    <FormErrorMessage>
                      {errors.plan?.crypto_network}
                    </FormErrorMessage>
                  )}
                </FormControl>
              </VStack>
            </Collapse>
            <HStack justifyContent="space-between" w="100%" mt={3}>
              <Button
                colorScheme="primary"
                onClick={handleSave}
                isLoading={isLoading}
              >
                {props?.initialValues?.id
                  ? 'Update Session Type'
                  : 'Create Session Type'}
              </Button>
              <Button
                variant="outline"
                colorScheme="primary"
                onClick={handleClose}
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

export default MeetingTypeModal
