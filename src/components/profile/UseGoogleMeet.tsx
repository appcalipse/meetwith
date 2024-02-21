import { FormControl, FormLabel, Heading, Switch } from '@chakra-ui/react'
import { ChangeEvent, useContext, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { Account, VideoMeeting } from '@/types/Account'
import { logEvent } from '@/utils/analytics'
import { saveAccountChanges } from '@/utils/api_helper'

import Block from './components/Block'

export const UseGoogleMeet: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const { login } = useContext(AccountContext)

  const [useGoogleMeet, setUseGoogleMeet] = useState<boolean>(
    currentAccount.preferences?.videoMeeting === VideoMeeting.GoogleMeet
  )

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    setUseGoogleMeet(event.target.checked)

    const updatedAccount = await saveAccountChanges({
      ...currentAccount!,
      preferences: {
        ...currentAccount!.preferences!,
        videoMeeting: event.target.checked
          ? VideoMeeting.GoogleMeet
          : VideoMeeting.None,
      },
    })
    logEvent('use_google_meet_toggled', { value: event.target.checked })
    login(updatedAccount)
  }

  return (
    <Block>
      <Heading fontSize="2xl" mb={8}>
        Google Meet
      </Heading>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="use-google-meet" mb="0">
          Use Google Meet for my next meetings?
        </FormLabel>
        <Switch
          id="use-google-meet"
          isChecked={useGoogleMeet}
          onChange={onChange}
        />
      </FormControl>
    </Block>
  )
}
