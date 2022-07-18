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
  HStack,
  Input,
  Select,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { v4 } from 'uuid'

import { GateConditionObject } from '@/types/TokenGating'

import { Account } from '../../types/Account'
import {
  getGateConditionsForAccount,
  saveAccountChanges,
} from '../../utils/api_helper'
import { getSlugFromText } from '../../utils/generic_utils'
import {
  AddGateObjectDialog,
  getDefaultConditionClone,
} from '../token-gate/AddGateObjectDialog'

interface IProps {
  isDialogOpen: boolean
  cancelDialogRef: React.MutableRefObject<any>
  onDialogClose: () => void
  currentAccount: Account | null | undefined
}

const NewMeetingTypeDialog: React.FC<IProps> = ({
  isDialogOpen,
  cancelDialogRef,
  onDialogClose,
  currentAccount,
}) => {
  const [title, setTitle] = useState<string | undefined>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [duration, setDuration] = useState<number>(30)
  const [minAdvanceTime, setMinAdvanceTime] = useState<any>({
    offset: '1',
    amount: 30,
  })
  const [accountGates, setAccountGates] = useState<GateConditionObject[]>([])
  const [selectedGate, setSelectedGate] = useState<
    GateConditionObject | undefined
  >(undefined)
  const [meetingGate, setMeetingGate] = useState<string>('')
  const selectRef = useRef<HTMLSelectElement>(null)

  const fetchAccountGates = async () => {
    const accountGates = await getGateConditionsForAccount(
      currentAccount!.address
    )
    setAccountGates(accountGates)
  }

  const handleSetSelectedGate = (gate: string) => {
    if (gate === 'noGate') {
      setSelectedGate(undefined)
    } else if (gate === 'newGate') {
      const defaultCondition = getDefaultConditionClone()
      setSelectedGate(defaultCondition)
    } else {
      setMeetingGate(gate)
    }
  }

  const onGateSave = (gateCondition: GateConditionObject) => {
    let _configs = [...accountGates]
    _configs = _configs.filter(config => config.id !== gateCondition.id)
    _configs.push(gateCondition)
    setAccountGates(_configs)
    selectRef.current!.value = gateCondition.id!
    handleSetSelectedGate(gateCondition.id!)
  }

  const createMeetingType = async () => {
    setLoading(true)
    const minAdvanceMinutes =
      Number(minAdvanceTime.offset) * minAdvanceTime.amount
    currentAccount?.preferences?.availableTypes.push({
      id: v4(),
      title: title as string,
      url: getSlugFromText(title as string),
      duration: duration,
      minAdvanceTime: minAdvanceMinutes,
      scheduleGate: meetingGate,
    })
    const updatedAccount = await saveAccountChanges(currentAccount as Account)
    onDialogClose()
  }

  useEffect(() => {
    fetchAccountGates()
  }, [])
  return (
    <Box>
      <AlertDialog
        size="2xl"
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelDialogRef}
        onClose={onDialogClose}
        blockScrollOnMount={false}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              New Meeting Type
            </AlertDialogHeader>

            <AlertDialogBody>
              <FormControl>
                <Text pt={2}>Title</Text>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  type="text"
                  placeholder="Title"
                />
              </FormControl>
              <FormControl pt={5}>
                <Text>Meeting Duration</Text>
                <Select
                  width="160px"
                  defaultValue={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </Select>
              </FormControl>
              <FormControl pt={5}>
                <Text>Minimum Notice Time</Text>
                <HStack>
                  <Input
                    width="140px"
                    type="number"
                    value={minAdvanceTime.amount}
                    onChange={e => {
                      setMinAdvanceTime({
                        amount: Number(e.target.value),
                        offset: minAdvanceTime.type,
                      })
                    }}
                  />
                  <Select
                    width="160px"
                    defaultValue={minAdvanceTime.type}
                    onChange={e => {
                      setMinAdvanceTime({
                        amount: minAdvanceTime.amount,
                        offset: e.target.value,
                      })
                    }}
                  >
                    <option value="1">minutes</option>
                    <option value="60">hours</option>
                    <option value="1440">days</option>
                  </Select>
                </HStack>
              </FormControl>
              <FormControl pt={5}>
                <Text>Add Meeting Gate</Text>
                <Select
                  width="160px"
                  ref={selectRef}
                  onChange={e => handleSetSelectedGate(e.target.value)}
                >
                  <option value="noGate">No gate</option>
                  {accountGates.map(gate => {
                    return (
                      <option key={gate.id} value={gate.id}>
                        {gate.title}
                      </option>
                    )
                  })}
                  <option value="newGate">Add new</option>
                </Select>
              </FormControl>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                color={useColorModeValue('gray.700', 'gray.300')}
                ref={cancelDialogRef}
                disabled={loading}
                onClick={onDialogClose}
              >
                Cancel
              </Button>
              <Button
                colorScheme="orange"
                onClick={() => createMeetingType()}
                ml={3}
                isLoading={loading}
              >
                Create
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AddGateObjectDialog
        selectedGate={selectedGate}
        onChange={gate => setSelectedGate(gate)}
        onClose={() => {
          setSelectedGate(undefined)
        }}
        onGateSave={onGateSave}
      />
    </Box>
  )
}

export default NewMeetingTypeDialog
