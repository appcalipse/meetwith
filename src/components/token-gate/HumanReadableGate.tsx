import { Flex, HStack, Image, Text } from '@chakra-ui/react'

import { ConditionRelation } from '@/types/common'
import { GateCondition, GateInterface } from '@/types/TokenGating'
import { formatUnits } from '@/utils/generic_utils'

interface HumanReadableGateProps {
  gateCondition: GateCondition
  center?: boolean
}
const HumanReadableGate: React.FC<HumanReadableGateProps> = props => {
  const nodes = []
  if (props.gateCondition.elements.length > 0) {
    for (let i = 0; i < props.gateCondition.elements.length; i++) {
      let text = ''
      let image = null
      const element = props.gateCondition.elements[i]
      element.minimumBalance = BigInt(element.minimumBalance)
      if (element.minimumBalance && element.minimumBalance != 0n) {
        text += `${formatUnits(
          element.minimumBalance,
          element.decimals || 0
        )} of `
      }
      text += `${element.itemName}`
      element.itemSymbol && (text += ` (${element.itemSymbol})`)

      if (element.type === GateInterface.POAP) {
        text += ` POAP`
        image = (
          <Image
            height="18px"
            mx={1}
            src={element.itemLogo}
            alt={element.itemName}
          />
        )
      }

      let separator = ''
      if (props.gateCondition.elements.length !== i + 1) {
        if (props.gateCondition.relation === ConditionRelation.AND) {
          separator += ' and '
        } else {
          separator += ' or '
        }
      }
      nodes.push({ text, image, separator })
    }
  }

  return (
    <HStack
      alignItems="center"
      flexWrap="wrap"
      justifyContent={props.center ? 'center' : 'flex-start'}
    >
      <Text mr={1}>User must hold</Text>
      {nodes.map((node, i) => (
        <Flex style={{ marginInlineStart: 0 }} alignItems="center" key={i}>
          <Text>{node.text}</Text>
          {node.image}
          <Text mr={2}>{node.separator}</Text>
        </Flex>
      ))}
    </HStack>
  )
}

export default HumanReadableGate
