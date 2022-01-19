import {
  Text,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Switch,
  Textarea,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState } from 'react'
import { ChipInput } from '../chip-input'
import { SingleDatepicker } from '../input-date-picker'
import { InputTimePicker } from '../input-time-picker'

export interface ScheduleModalProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onOpen,
  onClose,
}) => {
  const [useHuddle, setHuddle] = useState(true)

  const onParticipantsChange = (items: string[]) => {}

  const iconColor = useColorModeValue('gray.500', 'gray.200')

  const [selectedDate, setDate] = useState(new Date())
  const [selectedTime, setTime] = useState('')

  return (
    <Modal
      onClose={onClose}
      isOpen={isOpen}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <ModalOverlay />
      <ModalContent maxW="45rem">
        <ModalHeader>
          <Heading size={'sm'}>Schedule a new meeting</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="participants">Participants</FormLabel>
            <ChipInput
              placeholder="Insert wallet addresses, ens or unstoppable domain"
              onChange={onParticipantsChange}
            />
            <FormHelperText>
              Separate participants by comma. You will be added automatically,
              no need to insert yourself
            </FormHelperText>
          </FormControl>
          <FormControl sx={{ marginTop: '24px' }}>
            <FormLabel htmlFor="date">When</FormLabel>
            <HStack>
              <SingleDatepicker date={selectedDate} onDateChange={setDate} />
              <InputTimePicker value={selectedTime} onChange={setTime} />
              <Select id="duration" placeholder="Duration">
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </Select>
            </HStack>
          </FormControl>
          <FormControl sx={{ marginTop: '24px' }}>
            <FormLabel htmlFor="info">Information (optional)</FormLabel>
            <Textarea
              id="info"
              type="text"
              placeholder="Any information you want to share prior to the meeting?"
            />
          </FormControl>
          <FormControl sx={{ marginTop: '24px' }}>
            <FormLabel>Meeting link</FormLabel>
            <FormControl display="flex" alignItems="center">
              <Switch
                id="email-alerts"
                colorScheme={'orange'}
                defaultChecked={useHuddle}
                isChecked={useHuddle}
                onChange={() => setHuddle(value => !value)}
              />
              <FormLabel
                htmlFor="email-alerts"
                mb="0"
                sx={{ paddingLeft: '16px', fontWeight: 'normal' }}
              >
                <Text>
                  Use{' '}
                  <Link href="https://huddle01.com/" target={'_blank'}>
                    Huddle01
                  </Link>{' '}
                  for your meetings (a link will be generated for you).
                </Text>
                <Text>
                  Huddle01 is a web3-powered video conferencing tailored for
                  DAOs and NFT communities.
                </Text>
              </FormLabel>
            </FormControl>
            <Input
              mt="24px"
              display={useHuddle ? 'none' : 'inherit'}
              id="meeting-link"
              type="text"
              placeholder="Please insert meeting link"
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} colorScheme={'orange'}>
            Schedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
