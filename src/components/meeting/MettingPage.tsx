import { Box, Flex } from '@chakra-ui/react'
import {
  HuddleAppEvent,
  HuddleIframe,
  huddleIframeApp,
  IframeConfig,
} from '@huddle01/huddle01-iframe'
import { useContext, useEffect } from 'react'

import { AccountContext } from '@/providers/AccountProvider'

interface MeetingCardProps {
  label?: string
}
const MeetingPage = ({}: MeetingCardProps) => {
  const configObj: IframeConfig = {
    roomUrl: 'https://orbits.huddle01.com/Zn17uQ7oAS4q',
    height: '100%',
    width: '100%',
    noBorder: true,
  }

  const { currentAccount } = useContext(AccountContext)

  useEffect(() => {
    huddleIframeApp.on(HuddleAppEvent.PEER_JOIN, data =>
      console.log({ iframeData: data })
    )
    huddleIframeApp.on(HuddleAppEvent.PEER_LEFT, data =>
      console.log({ iframeData: data })
    )

    if (currentAccount) {
      console.log('hmmmmmm')
      huddleIframeApp.methods.connectWallet(currentAccount.address)
    }
  }, [currentAccount])

  setTimeout(() => {
    huddleIframeApp.methods.connectWallet(
      '0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b'
    )
  }, 5000)

  return (
    <Flex height="100%">
      <HuddleIframe config={configObj} />
    </Flex>
  )
}

export default MeetingPage
