import {
  ArrowBackIcon,
  ArrowForwardIcon,
  ArrowRightIcon,
} from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Button,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { MeetingRepeat } from '@meta/Meeting'
import {
  durationToHumanReadable,
  getAccountCalendarUrl,
  getAccountDomainUrl,
} from '@utils/calendar_manager'
import { appUrl } from '@utils/constants'
import {
  isSessionType,
  SessionType,
  SessionTypeOptions,
} from '@utils/constants/meeting-types'
import {
  DEFAULT_GROUP_SCHEDULING_DURATION,
  MeetingRepeatOptions,
} from '@utils/constants/schedule'
import { noClearCustomSelectComponent, Option } from '@utils/constants/select'
import useAccountContext from '@utils/hooks/useAccountContext'
import { ellipsizeAddress } from '@utils/user_manager'
import { Select as ChakraSelect } from 'chakra-react-select'
import React, { FC, useContext, useId } from 'react'

interface IProps {
  onClose: () => void
  isOpen: boolean
}
const CreateMeetingTypeModal: FC<IProps> = props => {
  const currentAccount = useAccountContext()
  const [sessionType, setSessionType] = React.useState<Option<SessionType>>(
    SessionTypeOptions[0]
  )
  const [availabilityBlock, setAvailabilityBlock] = React.useState<
    Option<string>
  >({
    value: 'default',
    label: 'Default',
  })
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [customBookingLink, setCustomBookingLink] = React.useState('')
  const keyId = useId()
  const handleSessionChange = (value: unknown) => {
    const sessionType = value as Option<SessionType>
    if (isSessionType(sessionType.value)) {
      setSessionType(sessionType)
    }
  }
  function middleTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text

    const half = Math.floor(maxLength / 2)
    return `${text.slice(0, half)}...${text.slice(-half)}`
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
          <HStack color={'primary.400'}>
            <ArrowBackIcon w={6} h={6} />
            <Text fontSize={16}>Back</Text>
          </HStack>
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
                  container: provided => ({
                    ...provided,
                    borderColor: 'inherit',
                    borderRadius: 'md',
                    maxW: '100%',
                    display: 'block',
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
                onChange={handleSessionChange}
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
                value={availabilityBlock}
                onChange={handleSessionChange}
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
            </VStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default CreateMeetingTypeModal
