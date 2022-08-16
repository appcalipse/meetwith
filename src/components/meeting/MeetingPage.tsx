import { Box, Flex } from '@chakra-ui/react'
import {
  HuddleAppEvent,
  HuddleIframe,
  huddleIframeApp,
  IframeConfig,
} from '@huddle01/huddle01-iframe'
import { Encrypted } from 'eth-crypto'
import { useRouter } from 'next/router'
import { ReactNode, useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { Account } from '@/types/Account'
import { MeetingDecrypted, MeetingProvider } from '@/types/Meeting'
import {
  fetchContentFromIPFSFromBrowser,
  getMeeting,
  joinHuddleRoom,
} from '@/utils/api_helper'
import { decryptMeeting } from '@/utils/calendar_manager'
import { getAccountDisplayName } from '@/utils/user_manager'

interface MeetingPageProps {
  slotId: string
}
const MeetingPage = ({ slotId }: MeetingPageProps) => {
  const { currentAccount, logged } = useContext(AccountContext)

  const router = useRouter()

  const [meeting, setMeeting] = useState(null as MeetingDecrypted | null)

  const getMeetingInfo = async () => {
    const meeting = await getMeeting(slotId)
    if (
      meeting.account_address.toLowerCase() !==
      currentAccount!.address.toLowerCase()
    ) {
      router.push('/404')
      return
    }

    const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
      meeting.meeting_info_file_path
    )) as Encrypted
    if (meetingInfoEncrypted) {
      const decryptedMeeting = await decryptMeeting(
        {
          ...meeting,
          meeting_info_encrypted: meetingInfoEncrypted,
        },
        currentAccount!
      )
      setMeeting(decryptedMeeting)
    } else {
      router.push('/404')
      return
    }
  }

  useEffect(() => {
    if (logged) {
      getMeetingInfo()
    }
  }, [logged, currentAccount])

  return (
    <Flex height="100%">
      {!logged ? (
        <NotLogged />
      ) : (
        meeting && (
          <LoggedAndHaveAccess
            decryptedMeeting={meeting!}
            currentAccount={currentAccount!}
          />
        )
      )}
    </Flex>
  )
}

const NotLogged = () => {
  return (
    <Box>
      <h1>You need to be logged in to view this page</h1>
    </Box>
  )
}

interface LoggedProps {
  decryptedMeeting: MeetingDecrypted
  currentAccount: Account
}

const LoggedAndHaveAccess: React.FC<LoggedProps> = ({
  decryptedMeeting,
  currentAccount,
}) => {
  const [iFrame, setIFrame] = useState(null as ReactNode | null)
  const { videoMeeting } = decryptedMeeting

  const huddleMeeting = async () => {
    const joinUrl = await joinHuddleRoom(
      getAccountDisplayName(currentAccount),
      videoMeeting.id
    )

    huddleIframeApp.on(HuddleAppEvent.PEER_JOIN, data =>
      console.log({ iframeData: data })
    )
    huddleIframeApp.on(HuddleAppEvent.PEER_LEFT, data =>
      console.log({ iframeData: data })
    )

    console.log(joinUrl)

    const configObj: IframeConfig = {
      roomUrl: joinUrl,
      height: '100%',
      width: '100%',
      noBorder: true,
    }

    setIFrame(<HuddleIframe config={configObj} />)
  }

  useEffect(() => {
    if (videoMeeting.provider === MeetingProvider.HUDDLE01) {
      huddleMeeting()
    }
  }, [])

  return <Box w="100%">{iFrame}</Box>
}

export default MeetingPage
