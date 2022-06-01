import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'

import {
  ConditionRelation,
  DummyGateElement,
  GateConditionObject,
  TokenInterface,
} from '@/types/TokenGating'
import { saveGateCondition } from '@/utils/api_helper'

import { TokenGateComponent } from './TokenGateComponent'

interface AddGateObjectDialogProps {
  onGateSave: (gateConditionObject: GateConditionObject) => void
  selectedGate?: GateConditionObject
  onChange: (gate: GateConditionObject) => void
  onClose: () => void
}

export const DEFAULT_CONDITION_OBJECT: GateConditionObject = {
  title: '',
  definition: {
    relation: ConditionRelation.AND,
    elements: [DummyGateElement],
    conditions: [],
  },
}

export const AddGateObjectDialog: React.FC<
  AddGateObjectDialogProps
> = props => {
  const toast = useToast()

  const [loading, setLoading] = useState(false)

  const validateElements = (): boolean => {
    for (const element of props.selectedGate!.definition.elements) {
      if (
        !element.tokenName ||
        !element.tokenSymbol ||
        !element.chain ||
        !element.tokenAddress ||
        !(
          element.type === TokenInterface.ERC20 &&
          element.decimals !== undefined &&
          element.decimals !== null
        )
      ) {
        return false
      }
    }
    return true
  }

  const close = () => {
    props.onClose()
  }

  const save = async () => {
    setLoading(true)

    if (!props.selectedGate!.title) {
      toast({
        title: 'Missing information',
        description:
          'Please provide a title for this meeting gate configuration',
        status: 'error',
        position: 'top',
        duration: 5000,
        isClosable: true,
      })
    } else if (!validateElements()) {
      toast({
        title: 'Missing information',
        description:
          'Please fill all the information for each token, or remove unused ones',
        status: 'error',
        position: 'top',
        duration: 5000,
        isClosable: true,
      })
    } else {
      const result = await saveGateCondition(props.selectedGate!)
      if (result) {
        props.onGateSave(props.selectedGate!)
        close()
      } else {
        toast({
          title: 'Something wrong',
          description: 'Failed to save information. Please contact us for help',
          status: 'error',
          position: 'top',
          duration: 5000,
          isClosable: true,
        })
      }
    }
    setLoading(false)
  }

  const updateInfo = (gate: GateConditionObject) => {
    props.onChange(gate)
  }

  return (
    <Modal
      blockScrollOnMount={false}
      isOpen={props.selectedGate !== undefined}
      onClose={close}
    >
      <ModalOverlay />
      {props.selectedGate && (
        <ModalContent maxW="45rem">
          <ModalHeader>Create new meeting gate</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Meeting gate title</FormLabel>
              <Input
                value={props.selectedGate!.title}
                type="text"
                placeholder="Give your new gate a title"
                onChange={event =>
                  updateInfo({
                    ...props.selectedGate!,
                    title: event.target.value,
                  })
                }
              />
            </FormControl>

            <TokenGateComponent
              updateTokenGate={gateObject =>
                updateInfo({
                  ...props.selectedGate!,
                  definition: { ...gateObject },
                })
              }
              tokenGate={props.selectedGate!.definition}
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="orange" onClick={save} isLoading={loading}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      )}
    </Modal>
  )
}
