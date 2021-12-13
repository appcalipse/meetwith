import { Button } from '@chakra-ui/button'
import { Input } from '@chakra-ui/input'
import { VStack } from '@chakra-ui/layout'
import { Textarea } from '@chakra-ui/textarea'
import { useContext, useState } from 'react'
import { AccountContext } from '../../providers/AccountProvider'
import { SocialLinkType } from '../../types/Account'
import { saveAccountChanges } from '../../utils/api_helper'

const AccountDetails: React.FC = () => {
  const { currentAccount, login } = useContext(AccountContext)

  const [loading, setLoading] = useState(false)

  const socialLinks = currentAccount?.preferences?.socialLinks || []

  const [description, setDescription] = useState(
    currentAccount?.preferences?.description || ''
  )
  const [twitter, setTwitter] = useState(
    socialLinks.filter(link => link.type === SocialLinkType.TWITTER)[0]?.url ||
      ''
  )
  const [discord, setDiscord] = useState(
    socialLinks.filter(link => link.type === SocialLinkType.DISCORD)[0]?.url ||
      ''
  )
  const [telegram, setTelegram] = useState(
    socialLinks.filter(link => link.type === SocialLinkType.TELEGRAM)[0]?.url ||
      ''
  )

  const saveDetails = async () => {
    setLoading(true)

    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount!,
        preferences: {
          ...currentAccount!.preferences!,
          description,
          socialLinks: [
            { type: SocialLinkType.TWITTER, url: twitter },
            { type: SocialLinkType.DISCORD, url: discord },
            { type: SocialLinkType.TELEGRAM, url: telegram },
          ],
        },
      })
      login(updatedAccount)
    } catch (e) {
      //TODO handle error
      console.log(e)
    }

    setLoading(false)
  }

  return (
    <VStack p={4}>
      <Textarea
        value={description}
        placeholder="Add a message you want "
        onChange={e => setDescription(e.target.value)}
      />

      <Input
        value={twitter}
        type="text"
        placeholder="Twitter"
        onChange={e => setTwitter(e.target.value)}
      />
      <Input
        value={discord}
        type="text"
        placeholder="Discord"
        onChange={e => setDiscord(e.target.value)}
      />
      <Input
        value={telegram}
        type="text"
        placeholder="Telegram"
        onChange={e => setTelegram(e.target.value)}
      />

      <Button
        isLoading={loading}
        alignSelf="end"
        colorScheme="orange"
        onClick={saveDetails}
      >
        Save details
      </Button>
    </VStack>
  )
}

export default AccountDetails
