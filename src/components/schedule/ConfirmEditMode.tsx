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
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'
import {
  ScheduleStateContext,
  useScheduleState,
} from '@/providers/schedule/ScheduleContext'
import { UpdateMode, updateModes } from '@/utils/constants/meeting'

export interface IConfirmEditModeModal {
  editMode?: UpdateMode
  setEditMode?: (mode: UpdateMode) => void
  onClose: () => void
  afterClose: () => void
  isOpen: boolean
}

const ConfirmEditModeModal: React.FC<IConfirmEditModeModal> = props => {
  const scheduleState = React.useContext(ScheduleStateContext)
  const editMode =
    props.editMode || scheduleState?.editMode || UpdateMode.SINGLE_EVENT
  const setEditMode =
    props.setEditMode || scheduleState?.setEditMode || (() => {})

  const handleClose = () => {
    props.onClose()
    props.afterClose()
  }
  return (
    <Modal
      onClose={props.onClose}
      isOpen={props.isOpen}
      blockScrollOnMount={false}
      size={'lg'}
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
          <Heading size={'md'}>Edit recurring event</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack gap={6}>
            <RadioGroup
              onChange={(val: UpdateMode) => setEditMode(val)}
              value={editMode}
              w={'100%'}
            >
              <VStack w={'100%'} gap={4}>
                {updateModes.map(provider => (
                  <Radio
                    flexDirection="row-reverse"
                    justifyContent="space-between"
                    w="100%"
                    colorScheme="primary"
                    value={provider.value}
                    key={provider.value}
                  >
                    <Text
                      fontWeight="600"
                      color={'border-default-primary'}
                      cursor="pointer"
                    >
                      {provider.label}
                    </Text>
                  </Radio>
                ))}
              </VStack>
            </RadioGroup>
            <HStack ml={'auto'} w={'fit-content'} gap={'4'}>
              <Button onClick={props.onClose} colorScheme="neutral">
                Cancel
              </Button>
              <Button onClick={handleClose} colorScheme="primary">
                Ok
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ConfirmEditModeModal
