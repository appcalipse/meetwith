import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  SimpleGrid,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'

import { ConditionRelation } from '@/types/common'
import {
  DummyGateElement,
  GateCondition,
  TokenGateElement,
} from '@/types/TokenGating'

import { TokenGateElementComponent } from './TokenGateElementComponent'

interface TokenGateComponentProps {
  tokenGate: GateCondition
  updateTokenGate: (tokenGate: GateCondition) => void
}

export const TokenGateComponent = (props: TokenGateComponentProps) => {
  const onGateElementChange = (
    tokenGateElement: TokenGateElement,
    position: number
  ) => {
    const gate = { ...props.tokenGate }
    gate.elements[position] = tokenGateElement
    props.updateTokenGate(gate)
  }

  const removeElement = (position: number) => {
    const gate = { ...props.tokenGate }
    gate.elements.splice(position, 1)
    props.updateTokenGate(gate)
  }

  const setGateCondition = (relation: ConditionRelation) => {
    const gate = { ...props.tokenGate }
    gate.relation = relation
    props.updateTokenGate(gate)
  }

  const addGateElement = () => {
    const gate = { ...props.tokenGate }
    gate.elements.push({ ...DummyGateElement })
    props.updateTokenGate(gate)
  }

  return (
    <Box position="relative">
      <VStack>
        <FormControl mb={4}>
          <FormLabel>Relation between components</FormLabel>
          <HStack>
            <Button
              colorScheme={
                props.tokenGate.relation == ConditionRelation.AND
                  ? 'primary'
                  : 'grayButton'
              }
              color={
                props.tokenGate.relation == ConditionRelation.OR
                  ? 'neutral.800'
                  : 'neutral.50'
              }
              onClick={() => setGateCondition(ConditionRelation.AND)}
            >
              ALL (AND)
            </Button>
            <Button
              colorScheme={
                props.tokenGate.relation == ConditionRelation.OR
                  ? 'primary'
                  : 'grayButton'
              }
              color={
                props.tokenGate.relation == ConditionRelation.OR
                  ? 'neutral.50'
                  : 'neutral.800'
              }
              onClick={() => setGateCondition(ConditionRelation.OR)}
            >
              SOME (OR)
            </Button>
          </HStack>
          <FormHelperText>
            {props.tokenGate.relation == ConditionRelation.AND
              ? 'User must have all the tokens you add'
              : 'User must have at least one of the tokens you add'}
          </FormHelperText>
        </FormControl>
      </VStack>

      <SimpleGrid mt={4} columns={2} spacing={10}>
        {props.tokenGate.elements.map((element, index) => {
          return (
            <TokenGateElementComponent
              tokenInfo={element}
              position={index}
              key={index}
              onChange={onGateElementChange}
              onRemove={removeElement}
            />
          )
        })}

        <Flex
          minH="8rem"
          onClick={addGateElement}
          cursor="pointer"
          alignItems="center"
          justifyContent="center"
          borderRadius={6}
          bgColor={useColorModeValue('gray.100', 'gray.800')}
          borderWidth={2}
        >
          <Text colorScheme="white">Add token</Text>
        </Flex>
      </SimpleGrid>
    </Box>
  )
}
