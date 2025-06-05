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
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useContext, useEffect, useState } from 'react'

import { ScheduleContext } from '@/pages/dashboard/schedule'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { ellipsizeAddress } from '@/utils/user_manager'
interface IProps {
  onClose: () => void
  isOpen: boolean
  participants: Array<ParticipantInfo>
}
const ScheduleParticipantsOwnersModal: FC<IProps> = props => {
  const { meetingOwners, setMeetingOwners } = useContext(ScheduleContext)
  const [owners, setOwners] = useState<Array<ParticipantInfo>>(meetingOwners)
  const handleSave = () => {
    setMeetingOwners(owners)
    props.onClose()
  }
  useEffect(() => {
    setOwners(meetingOwners)
  }, [meetingOwners])
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
              props.participants.map(participant => (
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
                  <HStack gap={4} minH={24}>
                    <Switch
                      colorScheme="primary"
                      size="md"
                      onChange={() =>
                        setOwners(prev => {
                          if (
                            prev.some(
                              val =>
                                val.account_address ===
                                participant.account_address
                            )
                          ) {
                            return prev.filter(
                              owner =>
                                owner.account_address !==
                                participant.account_address
                            )
                          }
                          return [...prev, participant]
                        })
                      }
                      isChecked={owners.some(
                        val =>
                          val.account_address === participant.account_address
                      )}
                    />
                    <Text>
                      {participant.name ||
                        (participant.account_address
                          ? ellipsizeAddress(participant.account_address)
                          : participant.guest_email)}
                    </Text>
                  </HStack>
                </HStack>
              ))
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
              >
                Save
              </Button>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
export default ScheduleParticipantsOwnersModal
