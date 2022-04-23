import {
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Input,
  Select,
  Spacer,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { ChangeEvent, useContext, useRef, useState } from 'react'
import { FaArrowLeft, FaLock } from 'react-icons/fa'

import { AccountContext } from '../../providers/AccountProvider'
import { Account, MeetingType } from '../../types/Account'
import { logEvent } from '../../utils/analytics'
import { saveMeetingType } from '../../utils/api_helper'
import {
  durationToHumanReadable,
  getAccountCalendarUrl,
} from '../../utils/calendar_manager'
import { getSlugFromText } from '../../utils/generic_utils'
import { isProAccount } from '../../utils/subscription_manager'
import { CopyLinkButton } from './components/CopyLinkButton'
import NewMeetingTypeDialog from './NewMeetingTypeDialog'

const MeetingTypesConfig: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)

  const [selectedType, setSelectedType] = useState<string>('')

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const cancelDialogRef = useRef<any>()

  const createType = async () => {
    logEvent('Clicked to create new meeting type')
    setIsDialogOpen(true)
  }

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
          <Grid
            templateColumns="repeat(auto-fit, minmax(300px, 1fr))"
            gap={4}
            flexWrap="wrap"
          >
            {currentAccount!.preferences!.availableTypes.map((type, index) => {
              const url = `${getAccountCalendarUrl(currentAccount!, false)}/${
                type.url
              }`
              return (
                <GridItem key={index}>
                  <MeetingTypeCard
                    onSelect={setSelectedType}
                    title={type.title}
                    duration={type.duration}
                    url={url}
                    typeId={type.id!}
                  />
                </GridItem>
              )
            })}
          </Grid>
          <VStack
            borderRadius={8}
            alignItems="center"
            pt={4}
            pb={4}
            height={'100%'}
            justifyContent="center"
          >
            <Button
              disabled={!isProAccount(currentAccount!)}
              colorScheme="orange"
              onClick={createType}
            >
              + New Meeting Type
            </Button>
            <NewMeetingTypeDialog
              currentAccount={currentAccount}
              isDialogOpen={isDialogOpen}
              cancelDialogRef={cancelDialogRef}
              onDialogClose={() => setIsDialogOpen(false)}
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
}

const MeetingTypeCard: React.FC<CardProps> = ({
  title,
  typeId,
  url,
  duration,
  onSelect,
}) => {
  const openType = () => {
    logEvent('Clicked to edit meeting type')
    onSelect(typeId)
  }

  return (
    <Box alignSelf="stretch">
      <VStack
        borderRadius={8}
        p={4}
        shadow={'md'}
        minW="280px"
        maxW="320px"
        alignItems="flex-start"
        height={'100%'}
        bgColor={useColorModeValue('white', 'gray.600')}
      >
        <Text fontWeight="medium">{title}</Text>
        <Text>Duration: {durationToHumanReadable(duration)}</Text>

        <HStack width="100%" pt={4}>
          <CopyLinkButton url={url} />
          <Button flex={1} colorScheme="orange" onClick={openType}>
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
  const { login } = useContext(AccountContext)
  const color = useColorModeValue('orange.500', 'orange.400')

  const typeConfig = account.preferences!.availableTypes.find(
    type => type.id === typeId
  )
  if (!typeConfig) {
    // TODO handle this
  }

  const convertMinutes = (minutes: number) => {
    if (minutes < 60) {
      return { amount: minutes, type: 'minutes' }
    } else if (minutes < 60 * 24) {
      return { amount: Math.floor(minutes / 60), type: 'hours' }
    } else {
      return { amount: Math.floor(minutes / (60 * 24)), type: 'days' }
    }
  }

  const [title, setTitle] = useState(typeConfig?.title || '')
  const [url, setUrl] = useState(typeConfig?.url || '')
  const [duration, setDuration] = useState(typeConfig!.duration)
  const [minAdvanceTime, setMinAdvanceTime] = useState(
    convertMinutes(typeConfig!.minAdvanceTime)
  )
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)

    const meetingType: MeetingType = {
      id: typeId,
      title,
      url,
      duration,
      minAdvanceTime:
        minAdvanceTime.amount *
        (minAdvanceTime.type === 'minutes'
          ? 1
          : minAdvanceTime.type === 'hours'
          ? 60
          : 60 * 24),
    }

    const account = await saveMeetingType(meetingType)
    login(account)
    logEvent('Updated meeting type', meetingType)

    //TODO handle error

    setLoading(false)
  }

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sluggedUrl = getSlugFromText(event.target.value)

    setUrl(sluggedUrl)
    setTitle(event.target.value)
  }

  return (
    <VStack p={4} alignItems="start">
      <HStack mb={4} cursor="pointer" onClick={goBack}>
        <Icon as={FaArrowLeft} size="1.5em" color={color} />
        <Text ml={3} color={color}>
          Back
        </Text>
      </HStack>
      <Text>Meeting type name</Text>
      <Input
        placeholder="What is this event about"
        value={title}
        onChange={handleTitleChange}
      />

      <Text pt={4}>Event link</Text>
      <Text fontSize="sm">
        {getAccountCalendarUrl(account, true)}/{!url ? '<link>' : url}
      </Text>

      <Text pt={4}>Meeting duration</Text>
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

      <Text pt={4}>
        Minimum amount of notice time for anyone to schedule a meeting with you
      </Text>
      <HStack>
        <Input
          width="140px"
          type="number"
          value={minAdvanceTime.amount}
          onChange={e => {
            setMinAdvanceTime({
              amount: Number(e.target.value),
              type: minAdvanceTime.type,
            })
          }}
        />
        <Select
          defaultValue={minAdvanceTime.type}
          onChange={e => {
            setMinAdvanceTime({
              amount: minAdvanceTime.amount,
              type: e.target.value,
            })
          }}
        >
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
          <option value="days">days</option>
        </Select>
      </HStack>

      <Checkbox isDisabled pt={4}>
        <HStack alignItems="center">
          <Text>Require payment for scheduling</Text>
          <Icon as={FaLock} />
          <Text>(coming soon)</Text>
        </HStack>
      </Checkbox>
      <Spacer />
      <Button
        isLoading={loading}
        alignSelf="start"
        colorScheme="orange"
        onClick={save}
      >
        Save information
      </Button>
    </VStack>
  )
}

export default MeetingTypesConfig
