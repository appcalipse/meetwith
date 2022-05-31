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
  GateCondition,
  GateConditionObject,
  TokenInterface,
} from '@/types/TokenGating'
import { saveGateCondition } from '@/utils/api_helper'

import { TokenGateComponent } from './TokenGateComponent'

interface AddGateObjectDialogProps {
  onAdd: (gateConditionObject: GateConditionObject) => void
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_OBJECT = {
  relation: ConditionRelation.AND,
  elements: [DummyGateElement],
  conditions: [],
}

export const AddGateObjectDialog: React.FC<
  AddGateObjectDialogProps
> = props => {
  const [gateConditionObject, setGateConditionObject] =
    useState<GateCondition>(DEFAULT_OBJECT)

  const toast = useToast()

  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const validateElements = (): boolean => {
    for (const element of gateConditionObject.elements) {
      if (
        !element.tokenName ||
        !element.tokenSymbol ||
        !element.chain ||
        !element.tokenAddress ||
        !(element.type === TokenInterface.ERC20 && element.decimals)
      ) {
        return false
      }
    }
    return true
  }

  const close = () => {
    setGateConditionObject(DEFAULT_OBJECT)
    props.onClose()
  }

  const save = async () => {
    setLoading(true)

    if (!title) {
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
      const result = await saveGateCondition({
        title,
        definition: gateConditionObject,
      })
      if (result) {
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

  return (
    <Modal blockScrollOnMount={false} isOpen={props.isOpen} onClose={close}>
      <ModalOverlay />
      <ModalContent maxW="45rem">
        <ModalHeader>Create new meeting gate</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={4}>
            <FormLabel>Meeting gate title</FormLabel>
            <Input
              value={title}
              type="text"
              placeholder="Give your new gate a title"
              onChange={event => setTitle(event.target.value)}
            />
          </FormControl>

          <TokenGateComponent
            updateTokenGate={gateObject => setGateConditionObject(gateObject)}
            tokenGate={gateConditionObject}
          />
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="orange" onClick={save} isLoading={loading}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
