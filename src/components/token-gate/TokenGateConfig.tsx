import { Link } from '@chakra-ui/next-js'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Image,
  Skeleton,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react'
import src from '@tiptap/extension-bubble-menu'
import { max } from 'date-fns'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { size } from 'viem'

import { AccountContext } from '@/providers/AccountProvider'
import { Account } from '@/types/Account'
import { getChainImage, SupportedChain } from '@/types/chains'
import { GateConditionObject } from '@/types/TokenGating'
import {
  deleteGateCondition,
  getGateConditionsForAccount,
} from '@/utils/api_helper'
import { GateInUseError } from '@/utils/errors'
import { isProAccount } from '@/utils/subscription_manager'
import { getTokenMeta } from '@/utils/token.service'

import {
  AddGateObjectDialog,
  getDefaultConditionClone,
} from './AddGateObjectDialog'
import HumanReadableGate from './HumanReadableGate'

export const TokenGateConfig: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState<GateConditionObject[]>([])
  const bgColor = useColorModeValue('white', 'neutral.900')
  const [gateToRemove, setGateToRemove] = useState<string | undefined>(
    undefined
  )
  const [selectedGate, setSelectedGate] = useState<
    GateConditionObject | undefined
  >(undefined)

  const onGateSave = (gateCondition: GateConditionObject) => {
    let _configs = [...configs]
    _configs = _configs.filter(config => config.id !== gateCondition.id)
    _configs.push(gateCondition)
    setConfigs(_configs)
  }

  const fetchConfigs = async () => {
    setLoading(true)
    const configs = await getGateConditionsForAccount(currentAccount!.address)
    setConfigs(configs)
    setLoading(false)
  }

  const onRemoval = (gateId: string) => {
    const _configs = [...configs]
    setConfigs(_configs.filter(c => c.id !== gateId))
  }

  useEffect(() => {
    setLoading(true)
    fetchConfigs()
  }, [currentAccount?.address])

  const isPro = isProAccount(currentAccount!)

  return (
    <Box width="100%" bg={bgColor} p={8} borderRadius={12}>
      <VStack alignItems="flex-start" width="100%" maxW="100%" gap={2}>
        <HStack
          width="100%"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Heading fontSize="2xl">Token Gates</Heading>

          <Button
            isDisabled={!isPro}
            colorScheme="primary"
            onClick={() => setSelectedGate(getDefaultConditionClone())}
          >
            Add new
          </Button>
        </HStack>
        <HStack
          width="100%"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Text color="neutral.400">
            Only users with a certain tokens can schedule meetings with you
          </Text>
          {!isPro && (
            <Text>
              <Link
                href="/dashboard/details#subscriptions"
                colorScheme="primary"
                fontWeight="bold"
              >
                Go PRO
              </Link>{' '}
              to create token gates.
            </Text>
          )}
        </HStack>
      </VStack>
      {loading ? (
        <LoadingComponent />
      ) : (
        <Box
          justifyContent="space-between"
          flexWrap="wrap"
          width="100%"
          display="flex"
          flexDirection="row"
          mt={6}
        >
          {configs.length > 0 &&
            configs
              .sort((a, b) =>
                a.title.localeCompare(b.title, undefined, {
                  sensitivity: 'base',
                })
              )
              .map((config, index) => (
                <GateConditionCard
                  key={index}
                  element={config}
                  onRemove={gateId => setGateToRemove(gateId)}
                  onEdit={gate =>
                    // doing this de-structuring to avoid UI from updating "automatically" while editing
                    setSelectedGate({
                      ...gate,
                      definition: {
                        ...gate.definition,
                        elements: [...gate.definition.elements],
                      },
                    })
                  }
                />
              ))}
        </Box>
      )}

      <AddGateObjectDialog
        selectedGate={selectedGate}
        onChange={gate => setSelectedGate(gate)}
        onClose={() => {
          setSelectedGate(undefined)
        }}
        onGateSave={onGateSave}
      />

      <RemoveGateDialog
        onSuccessRemoval={onRemoval}
        gateId={gateToRemove}
        onClose={() => setGateToRemove(undefined)}
      />
    </Box>
  )
}

const LoadingComponent = () => {
  return (
    <Stack mt={8}>
      <Skeleton height="60px" />
      <Skeleton height="60px" />
      <Skeleton height="60px" />
      <HStack pt={8} justifyContent="center">
        <Spinner />
        <Text fontSize="lg">Loading your gates...</Text>
      </HStack>
    </Stack>
  )
}

const GateConditionCard = (props: {
  element: GateConditionObject
  onRemove: (gateId: string) => void
  onEdit: (gate: GateConditionObject) => void
}) => {
  const [images, setImages] = useState<string[]>([])
  const [symbols, setSymbols] = useState<string[]>([])
  const getImages = async (element: GateConditionObject) => {
    const elements = element.definition.elements
    const images = []
    const symbols = []
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const tokenImage =
        element.itemLogo ||
        (element?.type === 'native'
          ? getChainImage(element.chain as SupportedChain)
          : (
              await getTokenMeta(
                element?.chain?.toLowerCase() || '',
                element?.itemId || ''
              )
            )?.image?.large)

      images.push(
        tokenImage ||
          `
        https://via.placeholder.com/150/000000/FFFFFF?text=${element.itemSymbol}
        `
      )
      symbols.push(element.itemSymbol || element.itemName)
    }
    setImages(images)
    setSymbols(symbols)
  }
  return (
    <Box
      borderRadius={4}
      bgColor={useColorModeValue('white', 'neutral.900')}
      shadow="sm"
      w={'100%'}
      flexBasis="49%"
    >
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
        <VStack alignItems="start" flex={1}>
          <Text>
            <b>{props.element.title}</b>
          </Text>
          <AvatarGroup size="md" max={3}>
            <HumanReadableGate gateCondition={props.element.definition} />
          </AvatarGroup>
        </VStack>
        <HStack width="100%" pt={4} gap={5}>
          <Button
            flex={1}
            colorScheme="orangeButton"
            variant="outline"
            onClick={_ => props.onRemove(props.element.id!)}
            px={'38px'}
          >
            Delete
          </Button>
          <Button
            flex={1}
            colorScheme="primary"
            onClick={_ => props.onEdit(props.element)}
            px={'38px'}
          >
            Edit
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

interface RemoveGateDialogProps {
  onClose: () => void
  gateId?: string
  onSuccessRemoval: (gateId: string) => void
}

const RemoveGateDialog: React.FC<RemoveGateDialogProps> = ({
  onClose,
  gateId,
  onSuccessRemoval,
}) => {
  const cancelRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const onDelete = async () => {
    setBusy(true)
    let deleted = false
    try {
      deleted = await deleteGateCondition(gateId!)
      if (!!deleted) {
        onSuccessRemoval(gateId!)
        setBusy(false)
        onClose()
        return
      }
    } catch (err) {
      if (err instanceof GateInUseError) {
        toast({
          title: 'Cannot remove gate',
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
      description: 'Something went wrong removing your gate',
      status: 'error',
      position: 'top',
      duration: 5000,
      isClosable: true,
    })
    setBusy(false)
  }

  return (
    <AlertDialog
      isOpen={gateId !== undefined}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove meeting gate
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to remove this gate?
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
