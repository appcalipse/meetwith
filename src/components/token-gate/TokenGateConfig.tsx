import { Box, Button, Text } from '@chakra-ui/react'
import { useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { GateConditionObject } from '@/types/TokenGating'
import { getGateConditionsForAccount } from '@/utils/api_helper'

import { AddGateObjectDialog } from './AddGateObjectDialog'

export const TokenGateConfig = () => {
  const { currentAccount } = useContext(AccountContext)
  const [configs, setConfigs] = useState<GateConditionObject[]>([])

  const [modalOpen, setModalOpen] = useState(false)

  const addNew = (gateCondition: GateConditionObject) => {
    setConfigs([...configs, gateCondition])
  }

  const fetchConfigs = async () => {
    const configs = await getGateConditionsForAccount(currentAccount!.address)
    setConfigs(configs)
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  return (
    <Box>
      {configs.map((config, index) => (
        <Text key={index}>{config.title}</Text>
      ))}

      <AddGateObjectDialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addNew}
      />

      <Button onClick={() => setModalOpen(true)}>Create new</Button>
    </Box>
  )
}
