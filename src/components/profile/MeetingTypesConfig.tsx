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
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useContext, useRef, useState } from 'react'
import { FaArrowLeft, FaTrash } from 'react-icons/fa'

import { removeMeetingType } from '@/utils/api_helper'
import { ApiFetchError } from '@/utils/errors'

import { AccountContext } from '../../providers/AccountProvider'
import { Account } from '../../types/Account'
import { logEvent } from '../../utils/analytics'
import {
  durationToHumanReadable,
  getAccountCalendarUrl,
} from '../../utils/calendar_manager'
import { isProAccount } from '../../utils/subscription_manager'
import { CopyLinkButton } from './components/CopyLinkButton'
import MeetingTypeConfig from './components/MeetingTypeConfig'
import NewMeetingTypeDialog from './NewMeetingTypeDialog'

const MeetingTypesConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { login } = useContext(AccountContext)

  const [selectedType, setSelectedType] = useState<string>('')
  const [typeToRemove, setTypeToRemove] = useState<string | undefined>(
    undefined
  )

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

  return (
    <Box>
      {selectedType ? (
        <TypeConfig
          typeId={selectedType}
          account={currentAccount!}
          goBack={() => setSelectedType('')}
        />
      ) : (
        <VStack width="100%" maxW="100%" alignItems={'flex-start'}>
          <Heading fontSize="2xl">Your meeting types</Heading>
          <SimpleGrid
            width="100%"
            minChildWidth="280px"
            spacingX="20px"
            spacingY="16px"
          >
            {currentAccount.preferences.availableTypes
              .filter(type => !type.deleted)
              .map((type, index) => {
                const url = `${getAccountCalendarUrl(currentAccount!, false)}/${
                  type.url
                }`
                return (
                  <Box key={type.id}>
                    <MeetingTypeCard
                      onSelect={setSelectedType}
                      title={type.title}
                      duration={type.duration}
                      url={url}
                      typeId={type.id!}
                      removeType={removeType}
                      showRemoval={
                        currentAccount!.preferences.availableTypes!.filter(
                          type => !type.deleted
                        ).length > 1
                      }
                    />
                    <Spacer />
                  </Box>
                )
              })}
          </SimpleGrid>
          <VStack
            borderRadius={8}
            alignItems="flex-start"
            pt={4}
            pb={4}
            height={'100%'}
            justifyContent="center"
          >
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
            <Button
              isDisabled={!isPro}
              colorScheme="primary"
              onClick={createType}
              leftIcon={<AddIcon width={15} height={15} />}
            >
              New Meeting Type
            </Button>
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
      )}
    </Box>
  )
}

interface CardProps {
  title?: string
  typeId: string
  url: string
  duration: number
  onSelect: (typeId: string) => void
  removeType: (typeId: string) => void
  showRemoval: boolean
}

const MeetingTypeCard: React.FC<CardProps> = ({
  title,
  typeId,
  url,
  duration,
  onSelect,
  removeType,
  showRemoval,
}) => {
  const openType = () => {
    logEvent('Clicked to edit meeting type')
    onSelect(typeId)
  }

  const iconColor = useColorModeValue('gray.500', 'gray.200')

  return (
    <Box alignSelf="stretch" mb={4}>
      <VStack
        borderRadius={8}
        p={4}
        shadow={'sm'}
        minW="280px"
        maxW="320px"
        alignItems="flex-start"
        height={'100%'}
        bgColor={useColorModeValue('white', 'neutral.900')}
      >
        <Flex width="100%">
          <VStack alignItems="flex-start" flex={1}>
            <Text fontWeight="medium">{title}</Text>
            <Text>Duration: {durationToHumanReadable(duration)}</Text>
          </VStack>
          {showRemoval && (
            <Box>
              <IconButton
                color={iconColor}
                aria-label="remove"
                icon={<FaTrash size={18} />}
                onClick={() => removeType(typeId)}
              />
            </Box>
          )}
        </Flex>
        <HStack width="100%" pt={4}>
          <CopyLinkButton url={url} />
          <Button flex={1} colorScheme="primary" onClick={openType}>
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

      onSuccessRemoval(account)
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
