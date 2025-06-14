import { AddIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  SimpleGrid,
  Spacer,
  Spinner,
  Tag,
  Tbody,
  Text,
  Th,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import ContactListItem from '@components/contact/ContactListItem'
import Loading from '@components/Loading'
import CreateMeetingTypeModal from '@components/meeting-settings/CreateMeetingTypeModal'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import React, {
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FaArrowLeft, FaClock, FaTrash } from 'react-icons/fa'

import { ConnectedCalendarCore } from '@/types/CalendarConnections'
import {
  getContacts,
  getMeetingTypes,
  listConnectedCalendars,
  removeMeetingType,
} from '@/utils/api_helper'
import { ApiFetchError } from '@/utils/errors'

import { AccountContext } from '../../providers/AccountProvider'
import { Account, MeetingType } from '../../types/Account'
import { logEvent } from '../../utils/analytics'
import {
  durationToHumanReadable,
  getAccountCalendarUrl,
} from '../../utils/calendar_manager'
import { isProAccount } from '../../utils/subscription_manager'
import EditMeetingTypeModal from '../meeting-settings/EditMeetingTypeModal'
import { CopyLinkButton } from './components/CopyLinkButton'
import MeetingTypeConfig from './components/MeetingTypeConfig'
import NewMeetingTypeDialog from './NewMeetingTypeDialog'

const MeetingTypesConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { login } = useContext(AccountContext)
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)
  const [typeToRemove, setTypeToRemove] = useState<string | undefined>(
    undefined
  )
  const {
    isOpen: isCreateModalOpen,
    onOpen: openCreateModal,
    onClose: closeCreateModal,
  } = useDisclosure()

  const {
    isOpen: isUpdateModalOpen,
    onOpen: openUpdateModal,
    onClose: closeUpdateModal,
  } = useDisclosure()

  const { data: connectedCalendar, isLoading: isQueryLoading } = useQuery<
    ConnectedCalendarCore[]
  >({
    queryKey: ['connectedCalendars', currentAccount?.id],
    queryFn: () => listConnectedCalendars(),
    enabled: !!currentAccount?.id,
  })

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])

  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const fetchMeetingTypes = async (reset?: boolean, limit = 10) => {
    const PAGE_SIZE = limit
    setIsLoading(true)
    const netMeetingTypes = await getMeetingTypes(
      PAGE_SIZE,
      reset ? 0 : meetingTypes.length
    )

    if (netMeetingTypes.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setMeetingTypes((reset ? [] : [...meetingTypes]).concat(netMeetingTypes))
    setIsLoading(false)
    setFirstFetch(false)
  }
  useEffect(() => {
    fetchMeetingTypes(true, 10)
  }, [currentAccount?.address])

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const cancelDialogRef = useRef<any>()

  const createType = async () => {
    logEvent('Clicked to create new meeting type')
    setIsDialogOpen(true)
  }

  const removeType = async (typeId: string) => {
    setTypeToRemove(typeId)
  }

  const typeRemoved = async (account: Account) => {
    login(account)
  }

  const onCloseRemoveDialog = () => {
    setTypeToRemove(undefined)
  }

  const isPro = isProAccount(currentAccount!)
  let content: ReactNode
  const refetch = async () => {
    await fetchMeetingTypes(true, meetingTypes.length + 1)
  }
  if (firstFetch) {
    content = (
      <Box>
        <Loading />
      </Box>
    )
  } else if (meetingTypes.length === 0) {
    content = (
      <Text textAlign="center" w="100%" mx="auto" py={4}>
        No meeting types found
      </Text>
    )
  } else {
    content = (
      <VStack w={'100%'}>
        <Box
          justifyContent="space-between"
          flexWrap="wrap"
          width="100%"
          display="flex"
          flexDirection="row"
          mt={6}
        >
          {meetingTypes.map((type, index) => {
            const url = `${getAccountCalendarUrl(currentAccount, false)}/${
              type.slug
            }`
            return (
              <MeetingTypeCard
                {...type}
                key={type.id}
                onSelect={(type: MeetingType) => {
                  setSelectedType(type)
                  openUpdateModal()
                }}
                title={type.title}
                duration={type.duration_minutes}
                url={url}
                typeId={type.id!}
                removeType={removeType}
                showRemoval={
                  currentAccount!.preferences.availableTypes!.filter(
                    type => !type.deleted_at
                  ).length > 1
                }
              />
            )
          })}
        </Box>
        {!noMoreFetch && !firstFetch && (
          <VStack mb={8}>
            <Button
              isLoading={isLoading}
              colorScheme="primary"
              variant="outline"
              alignSelf="center"
              my={4}
              onClick={() => fetchMeetingTypes()}
            >
              Load more
            </Button>
            <Spacer />
          </VStack>
        )}
      </VStack>
    )
  }
  return (
    <Box width="100%" bg={bgColor} p={8} borderRadius={12}>
      <CreateMeetingTypeModal
        onClose={closeCreateModal}
        isOpen={isCreateModalOpen}
        calendars={connectedCalendar || []}
        isCalendarLoading={isQueryLoading}
        refetch={refetch}
      />

      <EditMeetingTypeModal
        isOpen={isUpdateModalOpen}
        onClose={closeUpdateModal}
        calendarOptions={connectedCalendar || []}
        isCalendarLoading={isQueryLoading}
        refetch={refetch}
        selectedType={selectedType}
        key={selectedType?.id || 'no_key'}
      />

      <VStack width="100%" maxW="100%" alignItems={'flex-start'}>
        <VStack alignItems="flex-start" width="100%" maxW="100%" gap={2}>
          <HStack
            width="100%"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Heading fontSize="2xl">Meeting Types</Heading>
            <Button
              isDisabled={!isPro}
              colorScheme="primary"
              onClick={openCreateModal}
              leftIcon={<AddIcon width={15} height={15} />}
            >
              New Meeting Type
            </Button>
          </HStack>
          <HStack
            width="100%"
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Text color="neutral.400">Here are your meeting types</Text>
            {!isPro && (
              <Text pb="6">
                <Link
                  href="/dashboard/details#subscriptions"
                  colorScheme="primary"
                  fontWeight="bold"
                >
                  Go PRO
                </Link>{' '}
                to add as many meeting types as you want
              </Text>
            )}
          </HStack>
        </VStack>
        {content}
        <VStack
          borderRadius={8}
          alignItems="flex-start"
          height={'100%'}
          justifyContent="center"
        >
          <NewMeetingTypeDialog
            currentAccount={currentAccount}
            isDialogOpen={isDialogOpen}
            cancelDialogRef={cancelDialogRef}
            onDialogClose={() => setIsDialogOpen(false)}
          />
          <RemoveTypeDialog
            onClose={onCloseRemoveDialog}
            onSuccessRemoval={typeRemoved}
            typeId={typeToRemove}
          />
        </VStack>
      </VStack>
    </Box>
  )
}

interface CardProps extends MeetingType {
  typeId: string
  url: string
  duration: number
  onSelect: (type: MeetingType) => void
  removeType: (typeId: string) => void
  showRemoval: boolean
}

export const MeetingTypeCard: React.FC<CardProps> = ({
  title,
  typeId,
  url,
  duration,
  onSelect,
  removeType,
  showRemoval,
  ...props
}) => {
  const openType = () => {
    logEvent('Clicked to edit meeting type')
    const meetingType: MeetingType = {
      title,
      ...props,
    }
    onSelect(meetingType)
  }

  const iconColor = useColorModeValue('gray.500', 'gray.200')
  const [isHovered, setIsHovered] = useState(false)
  return (
    <Box w={'100%'} flexBasis="49%">
      <VStack
        borderRadius={12}
        borderColor="neutral.400"
        borderWidth={'1px'}
        p={5}
        shadow={'sm'}
        minW="280px"
        w={'100%'}
        alignItems="flex-start"
        height={'100%'}
        bgColor={useColorModeValue('white', 'neutral.900')}
      >
        <Flex width="100%" justifyContent="space-between">
          <VStack alignItems="flex-start" flex={1}>
            <Text fontWeight="medium" fontSize={20}>
              {title}
            </Text>
          </VStack>
          {props?.type && (
            <Tag
              bg="primary.400"
              variant="solid"
              px={3}
              py={2}
              h={'fit-content'}
              mr={2}
            >
              <Text fontWeight="bold">{props?.type}</Text>
            </Tag>
          )}
          <Box role={'group'} minH={10}>
            <HStack
              alignItems="center"
              bg={'neutral.800'}
              px={2}
              py={1}
              borderRadius={8}
              _groupHover={{
                display: 'none',
              }}
              h={'fit-content'}
            >
              <FaClock />
              <Text>{durationToHumanReadable(duration)}</Text>
            </HStack>
            {showRemoval && (
              <Box
                display={'none'}
                _groupHover={{
                  display: 'block',
                }}
              >
                <IconButton
                  color={iconColor}
                  aria-label="remove"
                  icon={<FaTrash size={18} />}
                  onClick={() => removeType(typeId)}
                />
              </Box>
            )}
          </Box>
        </Flex>
        <HStack justifyContent="space-between" w="100%">
          {props?.availabilities?.[0] && (
            <Tag colorScheme="neutral">
              Availability block: {props?.availabilities?.[0]?.title}
            </Tag>
          )}
          {props?.plan?.price_per_slot && (
            <Tag bg="green.500" fontSize="medium" color="white">
              ${props?.plan?.price_per_slot}/session
            </Tag>
          )}
        </HStack>
        <HStack width="100%" pt={4} gap={5}>
          <CopyLinkButton url={url} colorScheme="neutral" px={'38px'} />
          <Button flex={1} colorScheme="primary" onClick={openType} px={'38px'}>
            Edit
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

interface TypeConfigProps {
  account: Account
  typeId: string
  goBack: () => void
}
const TypeConfig: React.FC<TypeConfigProps> = ({ goBack, account, typeId }) => {
  const color = useColorModeValue('primary.500', 'primary.400')

  const typeConfig = account.preferences.availableTypes!.find(
    type => type.id === typeId
  )
  if (!typeConfig) {
    // TODO handle this
  }

  const [loading, setLoading] = useState(false)

  const childRef = useRef(null)

  const save = async () => {
    setLoading(true)
    await (childRef!.current as any).refSaveType()
    //TODO handle error
    setLoading(false)
  }

  return (
    <VStack p={4} alignItems="start">
      <HStack mb={4} cursor="pointer" onClick={goBack}>
        <Icon as={FaArrowLeft} size="1.5em" color={color} />
        <Text ml={3} color={color}>
          Back
        </Text>
      </HStack>
      <MeetingTypeConfig
        selectedType={typeConfig}
        currentAccount={account}
        ref={childRef}
      />
      <Spacer />
      <Button
        isLoading={loading}
        alignSelf="start"
        colorScheme="primary"
        onClick={save}
      >
        Save information
      </Button>
    </VStack>
  )
}

interface RemoveTypeDialogProps {
  onClose: () => void
  typeId?: string
  onSuccessRemoval: (updatedAccountPreferences: Account) => void
}

const RemoveTypeDialog: React.FC<RemoveTypeDialogProps> = ({
  onClose,
  typeId,
  onSuccessRemoval,
}) => {
  const cancelRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const onDelete = async () => {
    setBusy(true)

    try {
      const account = await removeMeetingType(typeId!)

      // onSuccessRemoval(account)
      setBusy(false)
      onClose()
      return
    } catch (err) {
      if (err instanceof ApiFetchError) {
        toast({
          title: 'Cannot remove type',
          description: err.message,
          status: 'error',
          position: 'top',
          duration: 5000,
          isClosable: true,
        })
        setBusy(false)
        onClose()
        return
      }
    }
    toast({
      title: 'Ops',
      description: 'Something went wrong removing your meeting type',
      status: 'error',
      position: 'top',
      duration: 5000,
      isClosable: true,
    })
    setBusy(false)
  }

  return (
    <AlertDialog
      isOpen={typeId !== undefined}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove meeting type
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to remove this type?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              color={useColorModeValue('gray.700', 'gray.300')}
              ref={cancelRef}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={onDelete}
              ml={3}
              isLoading={busy}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

export default MeetingTypesConfig
