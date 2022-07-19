import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Spacer,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useContext, useRef, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

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

const MeetingTypesConfig: React.FC = () => {
  const { currentAccount } = useContext(AccountContext)

  const [selectedType, setSelectedType] = useState<string>('')

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const cancelDialogRef = useRef<any>()

  const createType = async () => {
    logEvent('Clicked to create new meeting type')
    setIsDialogOpen(true)
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
            {currentAccount!.preferences!.availableTypes.map((type, index) => {
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
                <NextLink href="/dashboard/details" shallow passHref>
                  <Link colorScheme="orange" fontWeight="bold">
                    Go PRO
                  </Link>
                </NextLink>{' '}
                to add as many meeting types as you want
              </Text>
            )}
            <Button disabled={!isPro} colorScheme="orange" onClick={createType}>
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
    <Box alignSelf="stretch" mb={4}>
      <VStack
        borderRadius={8}
        p={4}
        shadow={'sm'}
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
  const color = useColorModeValue('orange.500', 'orange.400')

  const typeConfig = account.preferences!.availableTypes.find(
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
        colorScheme="orange"
        onClick={save}
      >
        Save information
      </Button>
    </VStack>
  )
}

export default MeetingTypesConfig
