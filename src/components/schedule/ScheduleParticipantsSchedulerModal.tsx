import {
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { MeetingProvider } from '@meta/Meeting'
import React, { FC, useContext, useEffect, useState } from 'react'

import { ScheduleContext } from '@/pages/dashboard/schedule'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { ellipsizeAddress } from '@/utils/user_manager'
interface IProps {
  onClose: () => void
  isOpen: boolean
  participants: Array<ParticipantInfo>
}
const ScheduleParticipantsSchedulerModal: FC<IProps> = props => {
  const { handleDelete } = useContext(ScheduleContext)
  const [scheduler, setScheduler] = useState<ParticipantInfo | undefined>(
    undefined
  )
  const handleSave = () => {
    handleDelete(scheduler)
    props.onClose()
  }
  const handleSchedulerChange = (identifier: string) => {
    const newScheduler = props.participants.find(scheduler => {
      const checks: Array<string> = []
      if (scheduler.account_address) {
        checks.push(scheduler.account_address)
      } else if (scheduler.guest_email) {
        checks.push(scheduler.guest_email)
      } else if (checks.length === 0 && scheduler.name) {
        checks.push(scheduler.name)
      }
      return checks.includes(identifier)
    })
    if (newScheduler) {
      setScheduler(newScheduler)
    }
  }
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      size={'sm'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent p="6">
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'md'}>Meeting participants</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={0}>
            {props.participants.length === 0 ? (
              <HStack w={'100%'} justifyContent="center" p={6}>
                <Text>No participants selected.</Text>
              </HStack>
            ) : (
              <RadioGroup
                onChange={val => handleSchedulerChange(val)}
                value={
                  scheduler?.account_address ||
                  scheduler?.guest_email ||
                  scheduler?.name ||
                  ''
                }
                w={'100%'}
              >
                <VStack w={'100%'} gap={0}>
                  {props.participants.map(participant => (
                    <HStack
                      key={participant.account_address}
                      p={0}
                      justifyContent="space-between"
                      width="100%"
                      h={'auto'}
                      _hover={{
                        bgColor: 'transparent',
                      }}
                      borderTopWidth={1}
                      borderBottomWidth={1}
                      borderColor="neutral.600"
                    >
                      <Radio
                        flexDirection="row-reverse"
                        justifyContent="space-between"
                        w="100%"
                        colorScheme="primary"
                        value={
                          participant.account_address ||
                          participant.guest_email ||
                          participant.name
                        }
                        key={
                          participant.account_address ||
                          participant.guest_email ||
                          participant.name
                        }
                        minH={24}
                      >
                        <Text
                          fontWeight="600"
                          color={'primary.200'}
                          cursor="pointer"
                        >
                          {participant.name ||
                            (participant.account_address
                              ? ellipsizeAddress(participant.account_address)
                              : participant.guest_email)}
                        </Text>
                      </Radio>
                    </HStack>
                  ))}
                </VStack>
              </RadioGroup>
            )}
          </VStack>
          {props.participants.length > 0 && (
            <VStack mt={6}>
              <Button
                colorScheme="primary"
                onClick={handleSave}
                ml={'auto'}
                right={0}
                px={6}
                color={'white'}
                bg={'orangeButton.800'}
                _hover={{
                  opacity: 0.75,
                }}
              >
                Delete Meeting
              </Button>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
export default ScheduleParticipantsSchedulerModal
