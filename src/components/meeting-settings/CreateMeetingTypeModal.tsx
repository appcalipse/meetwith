import { ArrowBackIcon } from '@chakra-ui/icons'
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
  Select,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ellipsizeAddress } from '@utils/user_manager'
import React, { FC } from 'react'

interface IProps {
  onClose: () => void
  isOpen: boolean
}
const CreateMeetingTypeModal: FC<IProps> = props => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      size={'xl'}
      isCentered
    >
      <ModalOverlay bg="rgba(19, 26, 32, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent p="6" bg="neutral.900">
        <ModalHeader p={'0'}>
          <HStack color={'primary.400'}>
            <ArrowBackIcon w={6} h={6} />
            <Text fontSize={16}>Back</Text>
          </HStack>
          <Heading fontSize={'24px'} mt={4} fontWeight={700}>
            New Session and Plan
          </Heading>
        </ModalHeader>
        <ModalBody p={'0'}>
          <Text color={'neutral.400'}>Create new session type</Text>
          <VStack mt={4} alignItems={'flex-start'} spacing={4}>
            <HStack width={'100%'} justifyContent={'space-between'}>
              <Text fontSize={'16px'}>Session Type</Text>
              <Select
                placeholder="Select session type"
                color={'neutral.200'}
                bg={'neutral.800'}
                borderColor={'neutral.700'}
                _hover={{ borderColor: 'primary.400' }}
                _focus={{ borderColor: 'primary.400' }}
              />
            </HStack>
            <HStack width={'100%'} justifyContent={'space-between'}>
              <Text fontSize={'16px'}>Plan Type</Text>
              <Switch colorScheme="primary" size="md" defaultChecked={false} />
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default CreateMeetingTypeModal
