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
import { useContext, useEffect, useRef, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'

import { AccountContext } from '@/providers/AccountProvider'
import { Account } from '@/types/Account'
import { GateConditionObject } from '@/types/TokenGating'
import {
  deleteGateCondition,
  getGateConditionsForAccount,
} from '@/utils/api_helper'
import { GateInUseError } from '@/utils/errors'
import { isProAccount } from '@/utils/subscription_manager'

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
  }, [currentAccount])

  const isPro = isProAccount(currentAccount!)

  return (
    <Box>
      <Heading fontSize="2xl" mb={4}>
        Meeting gates
      </Heading>

      {loading ? (
        <LoadingComponent />
      ) : configs.length > 0 ? (
        configs
          .sort((a, b) =>
            a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
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
          ))
      ) : (
        <VStack mb={8}>
          <Image
            alignSelf="center"
            src="/assets/no_gates.svg"
            height="200px"
            alt="No token gates created"
          />
          <HStack pt={8}>
            <Text fontSize="lg">You haven&lsquo;t created any gate yet</Text>
          </HStack>
        </VStack>
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

      {!isPro && (
        <Text pb="6">
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

      <Button
        isDisabled={!isPro}
        colorScheme="primary"
        onClick={() => setSelectedGate(getDefaultConditionClone())}
      >
        Add new
      </Button>
    </Box>
  )
}

const LoadingComponent = () => {
  return (
    <Stack my={8}>
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
  return (
    <Box
      my={2}
      borderRadius={4}
      bgColor={useColorModeValue('white', 'neutral.900')}
      p={8}
      shadow="sm"
    >
      <HStack>
        <VStack alignItems="flex-start" flex={1}>
          <Text>
            <b>{props.element.title}</b>
          </Text>
          <HumanReadableGate gateCondition={props.element.definition} />
        </VStack>
        <HStack ml={8}>
          <IconButton
            aria-label="Edit"
            icon={<FaEdit />}
            onClick={_ => props.onEdit(props.element)}
          />
          <IconButton
            aria-label="Remove"
            icon={<FaTrash />}
            onClick={_ => props.onRemove(props.element.id!)}
          />
        </HStack>
      </HStack>
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
