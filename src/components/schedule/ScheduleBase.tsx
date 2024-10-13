import { InfoIcon } from '@chakra-ui/icons'
import { Link } from '@chakra-ui/next-js'
import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Select,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import React, { ReactNode, useContext, useState } from 'react'

import { ChipInput } from '@/components/chip-input'
import { SingleDatepicker } from '@/components/input-date-picker'
import { InputTimePicker } from '@/components/input-time-picker'
import RichTextEditor from '@/components/profile/components/RichTextEditor'
import InfoTooltip from '@/components/profile/components/Tooltip'
import DiscoverATimeInfoModal from '@/components/schedule/DiscoverATimeInfoModal'
import ScheduleGroupModal from '@/components/schedule/ScheduleGroupModal'
import { Page, ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { MeetingProvider } from '@/types/Meeting'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { durationToHumanReadable } from '@/utils/calendar_manager'
import { renderProviderName } from '@/utils/generic_utils'
import { isProAccount } from '@/utils/subscription_manager'
import { ellipsizeAddress } from '@/utils/user_manager'

const ScheduleBase = () => {
  const { currentAccount } = useContext(AccountContext)
  const {
    participants,
    setParticipants,
    duration,
    title,
    content,
    handleContentChange,
    handleDurationChange,
    handleTitleChange,
    handlePageSwitch,
    handleSchedule,
    pickedTime,
    handleTimePick,
    isScheduling,
    meetingProvider,
    meetingUrl,
    setMeetingProvider,
    setMeetingUrl,
  } = useContext(ScheduleContext)
  const {
    isOpen: isGroupModalOpen,
    onOpen: openGroupModal,
    onClose: closeGroupModal,
  } = useDisclosure()

  const [inputError, setInputError] = useState(
    undefined as ReactNode | undefined
  )
  const meetingProviders = (
    currentAccount?.preferences?.meetingProviders || []
  ).concat(MeetingProvider.CUSTOM)
  const [openWhatIsThis, setOpenWhatIsThis] = useState(false)
  const iconColor = useColorModeValue('gray.800', 'white')
  const onParticipantsChange = (_participants: Array<ParticipantInfo>) => {
    if (!isProAccount(currentAccount!) && _participants.length > 1) {
      setInputError(
        <Text>
          <Link href="/dashboard/details#subscriptions">Go PRO</Link> to be able
          to schedule meetings with more than one invitee
        </Text>
      )
      participants.length == 0 && setParticipants([_participants[0]])
      return
    }
    setParticipants(_participants)
  }

  return (
    <Box>
      <DiscoverATimeInfoModal
        isOpen={openWhatIsThis}
        onClose={() => setOpenWhatIsThis(false)}
      />
      <ScheduleGroupModal onClose={closeGroupModal} isOpen={isGroupModalOpen} />
      <VStack gap={6} width="fit-content" m="auto" alignItems="flex-start">
        <Heading fontSize="x-large">Schedule new meeting</Heading>
        <VStack width="100%" gap={4}>
          <Flex width="100%" gap={4}>
            <FormControl>
              <FormLabel>Title</FormLabel>
              <Input
                placeholder="Enter meeting title"
                _placeholder={{
                  color: 'neutral.400',
                }}
                borderColor="neutral.400"
                disabled={isScheduling}
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
              />
            </FormControl>
            <FormControl w={'max-content'}>
              <FormLabel htmlFor="date">Duration</FormLabel>
              <Select
                id="duration"
                placeholder="Duration"
                onChange={e => handleDurationChange(Number(e.target.value))}
                value={duration}
                borderColor="neutral.400"
                width={'max-content'}
                maxW="350px"
              >
                {currentAccount!.preferences.availableTypes
                  .filter(type => !type.deleted && !type.private)
                  .map(type => (
                    <option key={type.id} value={type.duration}>
                      {durationToHumanReadable(type.duration)}
                    </option>
                  ))}
              </Select>
            </FormControl>
          </Flex>
          <FormControl>
            <FormLabel htmlFor="participants">
              Participants{' '}
              <InfoTooltip text="You can enter wallet addresses, ENS, Lens, Unstoppable Domain, or email" />
            </FormLabel>
            <Box>
              <ChipInput
                currentItems={participants}
                placeholder="Enter participants"
                onChange={onParticipantsChange}
                renderItem={p => {
                  if (p.account_address) {
                    return p.name || ellipsizeAddress(p.account_address!)
                  } else if (p.name && p.guest_email) {
                    return `${p.name} - ${p.guest_email}`
                  } else if (p.name) {
                    return `${p.name}`
                  } else {
                    return p.guest_email!
                  }
                }}
                inputProps={{
                  pr: 14,
                }}
                button={
                  <Button
                    variant={'link'}
                    pos="absolute"
                    insetY={0}
                    right={2}
                    _hover={{
                      textDecor: 'none',
                    }}
                    onClick={openGroupModal}
                    fontSize={{ base: 12, md: 16 }}
                  >
                    Add/Edit Groups
                  </Button>
                }
              />
            </Box>
            <FormHelperText>
              {inputError ? (
                inputError
              ) : (
                <Text>
                  Separate participants by comma. You will be added
                  automatically, no need to insert yourself
                </Text>
              )}
            </FormHelperText>
          </FormControl>
          <HStack width="fit-content" ml={'auto'}>
            <Text fontWeight="500">What is this?</Text>{' '}
            <InfoIcon
              onClick={() => setOpenWhatIsThis(true)}
              cursor="pointer"
              color={iconColor}
            />
          </HStack>
          <Button
            w="100%"
            py={3}
            h={'auto'}
            colorScheme="primary"
            onClick={() => handlePageSwitch(Page.SCHEDULE_TIME)}
            isDisabled={participants.length === 0 || !title || !duration}
          >
            Discover a time
          </Button>
        </VStack>
        <HStack width="100%">
          <Divider />
          <Text
            w={'100%'}
            color={'neutral.400'}
            whiteSpace="nowrap"
            fontWeight="700"
          >
            Or enter a time manually
          </Text>
          <Divider />
        </HStack>
        <FormControl w={'100%'}>
          <FormLabel htmlFor="date">When</FormLabel>
          <HStack w={'100%'}>
            <SingleDatepicker
              date={pickedTime || new Date()}
              onDateChange={handleTimePick}
              blockPast={true}
              inputProps={{
                height: 'auto',
                py: 3,
                pl: 12,

                borderColor: 'neutral.400',
                _placeholder: {
                  color: 'neutral.400',
                },
              }}
              iconColor="neutral.400"
              iconSize={20}
            />
            <InputTimePicker
              value={format(pickedTime || new Date(), 'p')}
              onChange={handleTimePick}
              currentDate={pickedTime || new Date()}
              inputProps={{
                height: 'auto',
                py: 3,
                pl: 12,
                borderColor: 'neutral.400',
                _placeholder: {
                  color: 'neutral.400',
                },
              }}
              iconColor="neutral.400"
              iconSize={20}
            />
          </HStack>
        </FormControl>
        <VStack alignItems="start" w={'100%'} gap={4}>
          <Text fontSize="18px" fontWeight={500}>
            Location
          </Text>
          <RadioGroup
            onChange={(val: MeetingProvider) => setMeetingProvider(val)}
            value={meetingProvider}
            w={'100%'}
          >
            <VStack w={'100%'} gap={4}>
              {meetingProviders.map(provider => (
                <Radio
                  flexDirection="row-reverse"
                  justifyContent="space-between"
                  w="100%"
                  colorScheme="primary"
                  value={provider}
                  key={provider}
                >
                  <Text fontWeight="600" color={'primary.200'} cursor="pointer">
                    {renderProviderName(provider)}
                  </Text>
                </Radio>
              ))}
            </VStack>
          </RadioGroup>
          {meetingProvider === MeetingProvider.CUSTOM && (
            <Input
              type="text"
              placeholder="insert a custom meeting url"
              isDisabled={isScheduling}
              my={4}
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
            />
          )}
        </VStack>
        <FormControl>
          <FormLabel htmlFor="info">Description (optional)</FormLabel>
          <RichTextEditor
            id="info"
            value={content}
            onValueChange={handleContentChange}
            placeholder="Any information you want to share prior to the meeting?"
          />
        </FormControl>
        <Button
          w="100%"
          py={3}
          h={'auto'}
          variant="outline"
          colorScheme="primary"
          onClick={handleSchedule}
          isLoading={isScheduling}
          isDisabled={
            participants.length === 0 || !title || !duration || !pickedTime
          }
        >
          Schedule now
        </Button>
      </VStack>
    </Box>
  )
}

export default ScheduleBase
