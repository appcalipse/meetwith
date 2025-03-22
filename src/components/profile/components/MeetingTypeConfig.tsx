import { Link } from '@chakra-ui/next-js'
import {
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Select,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import {
  forwardRef,
  ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { FaLock } from 'react-icons/fa'

import {
  AddGateObjectDialog,
  getDefaultConditionClone,
} from '@/components/token-gate/AddGateObjectDialog'
import { AccountContext } from '@/providers/AccountProvider'
import { Account, MeetingType } from '@/types/Account'
import { GateConditionObject } from '@/types/TokenGating'
import { logEvent } from '@/utils/analytics'
import {
  getGateConditionsForAccount,
  saveMeetingType,
} from '@/utils/api_helper'
import { getAccountCalendarUrl } from '@/utils/calendar_manager'
import { getSlugFromText } from '@/utils/generic_utils'
import { isProAccount } from '@/utils/subscription_manager'

interface IProps {
  children?: ReactNode
  selectedType?: MeetingType
  currentAccount: Account | null | undefined
}

interface HandleProps {
  refSaveType: () => void
}

const MeetingTypeConfig: React.ForwardRefRenderFunction<HandleProps, IProps> = (
  props,
  ref
) => {
  const { login } = useContext(AccountContext)

  const [title, setTitle] = useState<string>(props.selectedType?.title || '')
  const [description, setDescription] = useState<string>(
    props.selectedType?.description || ''
  )
  const [duration, setDuration] = useState<number>(
    props.selectedType?.duration || 30
  )
  const [accountGates, setAccountGates] = useState<GateConditionObject[]>([])
  const [selectedGate, setSelectedGate] = useState<
    GateConditionObject | undefined
  >(undefined)
  const [meetingGate, setMeetingGate] = useState<string>('')
  const [loadingGates, setLoadingGates] = useState<boolean>(true)
  const [customLink, setCustomLink] = useState<string>(
    props.selectedType?.customLink || ''
  )
  const [fixedLink, setFixedLink] = useState<boolean>(
    props.selectedType?.fixedLink || false
  )
  const [isPrivate, setPrivate] = useState<boolean>(
    props.selectedType?.private || false
  )
  const selectRef = useRef<HTMLSelectElement>(null)

  useImperativeHandle(ref, () => ({
    refSaveType: async () => {
      await save()
    },
  }))

  const convertMinutes = (minutes: number) => {
    if (minutes < 60) {
      return { amount: minutes, type: 'minutes', isEmpty: false }
    } else if (minutes < 60 * 24) {
      return { amount: Math.floor(minutes / 60), type: 'hours', isEmpty: false }
    } else {
      return {
        amount: Math.floor(minutes / (60 * 24)),
        type: 'days',
        isEmpty: false,
      }
    }
  }

  const [minAdvanceTime, setMinAdvanceTime] = useState(
    convertMinutes(props.selectedType?.minAdvanceTime || 60 * 24)
  )

  const fetchAccountGates = async () => {
    const accountGates = await getGateConditionsForAccount(
      props.currentAccount!.address
    )
    setAccountGates(accountGates)
    setMeetingGate(props.selectedType?.scheduleGate || '')
    setLoadingGates(false)
  }

  useEffect(() => {
    fetchAccountGates()
  }, [])

  const handleSetSelectedGate = (gate: string) => {
    if (gate === undefined) {
      setSelectedGate(undefined)
      setMeetingGate('')
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

  const save = async () => {
    const meetingType: MeetingType = {
      id: props.selectedType?.id || '',
      title,
      description,
      url: getSlugFromText(title as string),
      duration,
      minAdvanceTime:
        minAdvanceTime.amount *
        (minAdvanceTime.type === 'minutes'
          ? 1
          : minAdvanceTime.type === 'hours'
          ? 60
          : 60 * 24),
      scheduleGate: meetingGate,
      private: isPrivate,
      customLink,
      fixedLink,
    }

    const account = await saveMeetingType(meetingType)
    login(account)
    logEvent('Updated meeting type', meetingType)
  }

  const isPro = isProAccount(props.currentAccount!)

  return (
    <>
      <FormControl>
        <Text pt={2}>Title</Text>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          type="text"
          placeholder="Title"
        />
      </FormControl>
      <Text pt={4}>Event link</Text>
      <Text fontSize="sm">
        {getAccountCalendarUrl(props.currentAccount!, true)}/
        {!title ? '<link>' : getSlugFromText(title as string)}
      </Text>

      <FormControl pt={2}>
        <FormLabel>Description (optional)</FormLabel>
        <Textarea
          placeholder="Add an optional description to this meeting type. It will appear on your public calendar"
          onChange={e => setDescription(e.target.value)}
          value={description}
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
        <Text>Custom Meeting location</Text>
        <Input
          width={'345px'}
          type="text"
          placeholder="Google Meet, Zoom, Discord anywhere"
          value={customLink}
          onChange={e => setCustomLink(e.target.value)}
        />
        <HStack py={4}>
          <Switch
            colorScheme="primary"
            size="md"
            isChecked={fixedLink}
            onChange={e => setFixedLink(e.target.checked)}
          />
          <Text>Allow scheduler to edit custom meeting location</Text>
        </HStack>
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
                type: minAdvanceTime.type,
                isEmpty: false,
              })
            }}
          />
          <Select
            width="160px"
            defaultValue={minAdvanceTime.type}
            onChange={e => {
              setMinAdvanceTime({
                amount: minAdvanceTime.amount,
                type: e.target.value,
                isEmpty: false,
              })
            }}
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </Select>
        </HStack>
      </FormControl>
      <FormControl pt={5}>
        <Text>Gate meeting schedule</Text>
        <Text fontSize="sm" pb={2}>
          Require scheduler to hold a set of specific tokens to schedule
          meetings
        </Text>
        <Select
          width="160px"
          isDisabled={loadingGates || !isPro}
          ref={selectRef}
          value={meetingGate}
          onChange={e => handleSetSelectedGate(e.target.value)}
        >
          <option value={undefined}>No gate</option>
          {accountGates.map(gate => {
            return (
              <option key={gate.id} value={gate.id}>
                {gate.title}
              </option>
            )
          })}
          <option value="newGate">Add new</option>
        </Select>
        {!isPro && (
          <VStack alignItems="flex-start">
            <Text py="3">
              <Link
                href="/dashboard/details#subscriptions"
                colorScheme="primary"
                fontWeight="bold"
              >
                Go PRO
              </Link>{' '}
              to add token gates to your meetings
            </Text>
          </VStack>
        )}
      </FormControl>

      <FormControl>
        <HStack py={4}>
          <Switch
            colorScheme="primary"
            size="md"
            isChecked={isPrivate}
            onChange={e => setPrivate(e.target.checked)}
          />
          <Text>
            Private (only people with the direct link can schedule this meeting
            type)
          </Text>
        </HStack>
      </FormControl>

      <FormControl>
        <Checkbox isDisabled pt={4}>
          <HStack alignItems="center">
            <Text>Require payment for scheduling</Text>
            <Icon as={FaLock} />
            <Text>(coming soon)</Text>
          </HStack>
        </Checkbox>
      </FormControl>

      <AddGateObjectDialog
        selectedGate={selectedGate}
        onChange={gate => setSelectedGate(gate)}
        onClose={() => {
          setSelectedGate(undefined)
        }}
        onGateSave={onGateSave}
      />
    </>
  )
}

export default forwardRef(MeetingTypeConfig)
