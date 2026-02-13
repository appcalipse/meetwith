import { Box, Text, VStack } from '@chakra-ui/layout'
import {
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftAddon,
  useDisclosure,
} from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/textarea'
import { Avatar } from '@components/profile/components/Avatar'
import EditImageModal from '@components/profile/components/EditImageModal'
import { handleApiError } from '@utils/error_helper'
import { readFile } from '@utils/image-utils'
import { ellipsizeAddress, getAccountDisplayName } from '@utils/user_manager'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { useActiveWallet } from 'thirdweb/react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import {
  Account,
  BannerSetting,
  SocialLink,
  SocialLinkType,
} from '@/types/Account'
import { SupportedChain } from '@/types/chains'
import { Plan } from '@/types/Subscription'
import {
  getUnstoppableDomainsForAddress,
  saveAccountChanges,
  syncSubscriptions,
  updateCustomSubscriptionDomain,
} from '@/utils/api_helper'
import { appUrl } from '@/utils/constants'
import { getLensHandlesForAddress } from '@/utils/lens.helper'
import { checkValidDomain, resolveENS } from '@/utils/rpc_helper_front'
import { saveSubscriptionHandle } from '@/utils/storage'
import {
  changeDomainOnChain,
  getActiveProSubscription,
  isProAccount,
} from '@/utils/subscription_manager'
import { useToastHelpers } from '@/utils/toasts'

import ImageIcon from '../icons/Image'
import BannerPreviewModal from './components/BannerPreviewModal'
import Block from './components/Block'
import EditBannerImageModal from './components/EditBannerImageModal'
import HandlePicker, {
  DisplayName,
  ProfileInfoProvider,
} from './components/HandlePicker'
import Tooltip from './components/Tooltip'

const AccountDetails: React.FC<{ currentAccount: Account }> = ({
  currentAccount: currentAccountProp,
}) => {
  const { login, currentAccount: currentAccountFromContext } =
    useContext(AccountContext)
  const { reload: reloadOnboardingInfo } = useContext(OnboardingContext)

  const currentAccount = currentAccountFromContext || currentAccountProp

  const [loading, setLoading] = useState(false)
  const socialLinks = currentAccount?.preferences?.socialLinks || []

  const [description, setDescription] = useState(
    currentAccount?.preferences?.description || ''
  )
  const { push } = useRouter()
  const [nameOptions, setNameOptions] = useState<DisplayName[]>([])

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>()
  const {
    isOpen: isEditImageModalOpen,
    onOpen: openEditImageModal,
    onClose: closeEditImageModal,
  } = useDisclosure()
  const {
    isOpen: isEditBannerImageModalOpen,
    onOpen: openEditBannerImageModal,
    onClose: closeEditBannerImageModal,
  } = useDisclosure()
  const {
    isOpen: isBannerPreviewModalOpen,
    onOpen: openBannerPreviewModal,
    onClose: closeBannerPreviewModal,
  } = useDisclosure()
  const [name, setName] = useState<DisplayName | undefined>(() => {
    const currentName = currentAccount?.preferences?.name
    if (currentName) {
      return {
        label: currentName,
        value: currentName,
        type: ProfileInfoProvider.CUSTOM,
      }
    }
    return undefined
  })

  const { showSuccessToast, showErrorToast } = useToastHelpers()
  const activeWallet = useActiveWallet()

  const activeSubscription = React.useMemo(
    () => getActiveProSubscription(currentAccount),
    [currentAccount]
  )
  const isLegacyBlockchainSubscription =
    activeSubscription && activeSubscription.chain

  const [proDomain, setProDomain] = useState<string>(
    activeSubscription?.domain || ''
  )
  const [newProDomain, setNewProDomain] = useState<string>(
    activeSubscription?.domain ?? ''
  )

  React.useEffect(() => {
    const domain = activeSubscription?.domain || ''
    setProDomain(domain)
    setNewProDomain(domain)
  }, [activeSubscription?.domain])
  const [_currentPlan, setCurrentPlan] = useState<Plan | undefined>(undefined)

  const saveDetails = async () => {
    setLoading(true)
    try {
      const updatedAccount = await saveAccountChanges({
        ...currentAccount,
        preferences: {
          ...currentAccount.preferences,
          description,
          socialLinks: [
            {
              type: SocialLinkType.TWITTER,
              url: twitter,
            },
            {
              type: SocialLinkType.TELEGRAM,
              url: telegram,
            },
          ],
          ...(name?.value ? { name: name.value } : { name: '' }),
        },
      })
      login(updatedAccount)
      reloadOnboardingInfo()
      showSuccessToast(
        'Profile Details Updated',
        'Your profile details have been updated successfully'
      )
    } catch (error) {
      console.error(error)
      handleApiError('Error updating profile', error)
    }
    setLoading(false)
  }

  const [twitter, setTwitter] = useState(
    socialLinks.find((link: SocialLink) => link.type === SocialLinkType.TWITTER)
      ?.url || ''
  )
  const [telegram, setTelegram] = useState(
    socialLinks.find(
      (link: SocialLink) => link.type === SocialLinkType.TELEGRAM
    )?.url || ''
  )

  const updateAccountInfo = () => {
    const socialLinks = currentAccount?.preferences?.socialLinks || []

    setTwitter(
      socialLinks.find(
        (link: SocialLink) => link.type === SocialLinkType.TWITTER
      )?.url || ''
    )
    setTelegram(
      socialLinks.find(
        (link: SocialLink) => link.type === SocialLinkType.TELEGRAM
      )?.url || ''
    )

    setDescription(currentAccount?.preferences?.description || '')

    if (!name || name.value !== currentAccount?.preferences?.name) {
      setName(
        currentAccount?.preferences?.name
          ? {
              label: currentAccount.preferences.name,
              value: currentAccount.preferences.name,
              type: ProfileInfoProvider.CUSTOM,
            }
          : undefined
      )
    }

    const proDomain = getActiveProSubscription(currentAccount)?.domain ?? ''
    setNewProDomain(proDomain)
    if (proDomain) {
      saveSubscriptionHandle(proDomain)
    }
  }

  const updateAccountSubs = async () => {
    setCurrentPlan(isProAccount(currentAccount!) ? Plan.PRO : undefined)
    const subscriptions = await syncSubscriptions()
    currentAccount!.subscriptions = subscriptions
    login(currentAccount!)
    setCurrentPlan(isProAccount(currentAccount!) ? Plan.PRO : undefined)

    const updatedActiveSubscription = getActiveProSubscription(currentAccount)
    if (updatedActiveSubscription?.domain) {
      setProDomain(updatedActiveSubscription.domain)
      saveSubscriptionHandle(updatedActiveSubscription.domain)
    }
  }

  const changeDomain = async () => {
    setLoading(true)

    if (newProDomain === proDomain) {
      setLoading(false)
      showErrorToast('No Changes Made', "You didn't change the current link")
      return
    }

    if (!(await checkValidDomain(newProDomain, currentAccount!.address))) {
      setLoading(false)
      showErrorToast(
        'You are not the owner of this domain',
        'To use ENS, Lens, Unstoppable domain, or other name services as your name you need to be the owner of it'
      )
      return
    }

    try {
      if (!activeSubscription) {
        setLoading(false)
        showErrorToast(
          'No Active Subscription',
          'You need an active subscription to update your calendar link'
        )
        return
      }

      const isCustomChain = activeSubscription.chain === SupportedChain.CUSTOM
      const isBillingSubscription =
        activeSubscription.billing_plan_id !== null &&
        activeSubscription.billing_plan_id !== undefined

      if (isCustomChain || isBillingSubscription) {
        await updateCustomSubscriptionDomain(newProDomain)
      } else {
        if (!activeSubscription.chain) {
          setLoading(false)
          showErrorToast(
            'Invalid Subscription',
            'Unable to determine subscription type. Please contact support.'
          )
          return
        }
        await changeDomainOnChain(
          currentAccount.address,
          proDomain,
          newProDomain,
          activeWallet!
        )
      }
      await updateAccountSubs()
      setProDomain(newProDomain)
      saveSubscriptionHandle(newProDomain)
      showSuccessToast(
        'Calendar Link Updated',
        'Your calendar link has been changed successfully'
      )
    } catch (e: unknown) {
      console.error(e)
      if (e instanceof Error) {
        showErrorToast('Domain Change Failed', `${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const getHandles = async () => {
    let handles: DisplayName[] = []

    const currentName = currentAccount?.preferences?.name
    if (currentName) {
      handles.push({
        label: currentName,
        value: currentName,
        type: ProfileInfoProvider.CUSTOM,
      })
    }

    const lensProfiles = async () => {
      const profiles = await getLensHandlesForAddress(currentAccount!.address)
      if (profiles) {
        handles = handles.concat(
          profiles.map(profile => {
            return {
              label: profile.handle,
              value: profile.handle,
              type: ProfileInfoProvider.LENS,
            }
          })
        )
      }
    }

    const getUNHandles = async () => {
      const domains = await getUnstoppableDomainsForAddress(
        currentAccount!.address
      )

      if (domains) {
        handles = handles.concat(
          domains.map(profile => {
            return {
              label: profile.name,
              value: profile.name,
              type: ProfileInfoProvider.UNSTOPPABLE_DOAMINS,
            }
          })
        )
      }
    }

    const getENSHandle = async () => {
      const ens = await resolveENS(currentAccount!.address)
      if (ens) {
        handles.push({
          label: ens.name,
          value: ens.name,
          type: ProfileInfoProvider.ENS,
        })
      }
    }

    await Promise.all([lensProfiles(), getUNHandles(), getENSHandle()])

    setNameOptions(handles)
    const currentHandle = handles.find(
      h => h.value === currentAccount?.preferences?.name
    )
    setName(currentHandle)
  }

  useEffect(() => {
    void getHandles()
    updateAccountInfo()
  }, [currentAccount])

  const handleSelectFile = async () => {
    return new Promise<string | undefined>(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/jpeg, image/png, image/webp'
      input.onchange = async e => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        setLoading(true)
        try {
          const imageDataUrl = await readFile(file)
          return resolve(imageDataUrl)
        } catch (error) {
          console.error('Error uploading image:', error)
          resolve(undefined)
        } finally {
          setLoading(false)
        }
      }
      input.click()
    })
  }
  const handleSelectAvatar = async () => {
    const imageDataUrl = await handleSelectFile()
    if (!imageDataUrl) return
    setSelectedImageUrl(imageDataUrl)
    openEditImageModal()
  }
  const hanldeSelectBanner = async () => {
    const imageDataUrl = await handleSelectFile()
    if (!imageDataUrl) return
    setSelectedImageUrl(imageDataUrl)
    openEditBannerImageModal()
  }

  return (
    <VStack width="100%" maxW="100%" gap={6} alignItems={'flex-start'}>
      <Block>
        <>
          <Heading fontSize="2xl" mb={4}>
            Account Details
          </Heading>

          <EditImageModal
            imageSrc={selectedImageUrl}
            isDialogOpen={isEditImageModalOpen}
            onDialogClose={closeEditImageModal}
            accountAddress={currentAccount?.address}
            changeAvatar={avatar => {
              currentAccount.preferences.avatar_url = avatar
              void login(currentAccount)
            }}
          />

          <FormControl pt={2}>
            <HStack width="100%" textAlign="center" mb={6}>
              <Box width="64px" height="64px">
                <Avatar
                  address={currentAccount.address}
                  avatar_url={currentAccount.preferences?.avatar_url}
                  name={getAccountDisplayName(currentAccount)}
                />
              </Box>

              <VStack ml={2} flex={1} alignItems="flex-start">
                <Text fontSize="lg" fontWeight={500}>
                  {name?.label || ellipsizeAddress(currentAccount.address)}
                </Text>
                <Button
                  flex={1}
                  colorScheme="primary"
                  variant={'link'}
                  px={0}
                  style={{ display: 'flex' }}
                  onClick={handleSelectAvatar}
                  textDecoration="underline"
                >
                  Edit profile picture
                </Button>
              </VStack>
            </HStack>

            <FormLabel>
              Calendar link
              <Tooltip text="Other users can book meetings with you through this personal domain" />
            </FormLabel>
            <HStack>
              <InputGroup>
                <InputLeftAddon
                  pointerEvents="none"
                  borderRightColor="transparent !important"
                  bgColor="transparent"
                  pr={0}
                  className={currentAccount?.subscriptions ? '' : 'disabled'}
                >
                  <Text opacity="0.5">{`${appUrl}/`}</Text>
                </InputLeftAddon>
                <Input
                  pl={0}
                  borderLeftColor="transparent"
                  value={newProDomain}
                  type="text"
                  disabled={!activeSubscription}
                  placeholder={
                    activeSubscription
                      ? 'your_custom_link'
                      : `address/${currentAccount?.address}`
                  }
                  onChange={e => setNewProDomain(e.target.value)}
                />
              </InputGroup>

              <Button
                isLoading={loading}
                colorScheme="primary"
                variant="outline"
                isDisabled={!activeSubscription}
                onClick={changeDomain}
              >
                Update
              </Button>
            </HStack>
            <FormHelperText>
              {activeSubscription ? (
                isLegacyBlockchainSubscription ? (
                  'There is a gas fee associated with each link change.'
                ) : (
                  'You can update your calendar link at any time.'
                )
              ) : (
                <>
                  Unlock custom calendar link with PRO{' '}
                  <Button
                    variant="link"
                    colorScheme="primary"
                    px={0}
                    onClick={() => push('/dashboard/settings/subscriptions')}
                    textDecoration="underline"
                  >
                    here
                  </Button>
                  .
                </>
              )}
            </FormHelperText>
          </FormControl>

          <Divider my={8} />

          <FormControl pb={3}>
            <FormLabel>
              Display name
              <Tooltip
                text="How do you want to be displayed to others in meetings? Leave empty
              to use you wallet address"
              />
            </FormLabel>
            <HandlePicker
              selected={name}
              setValue={option => setName(option)}
              options={nameOptions}
            />
          </FormControl>

          <FormControl py={3}>
            <FormLabel>
              Link preview image (optional)
              <Tooltip text="This image will be displayed when sharing your calendar link on social media platforms." />
            </FormLabel>
            <VStack
              minH={'200px'}
              justify="center"
              align="center"
              border="1px solid"
              borderColor="whiteAlpha.300"
              py={3}
              px={5}
              pos="relative"
              rounded={6}
            >
              {currentAccount?.preferences?.banner_url && (
                <Button
                  flex={1}
                  colorScheme="primary"
                  variant={'link'}
                  px={0}
                  style={{ display: 'flex' }}
                  onClick={openBannerPreviewModal}
                  textDecoration="underline"
                  position="absolute"
                  right={4}
                  top={3}
                  cursor="pointer"
                >
                  Preview banner
                </Button>
              )}
              <VStack gap={1}>
                {currentAccount?.preferences?.banner_url ? (
                  <Image
                    src={currentAccount?.preferences?.banner_url}
                    alt="Banner Image"
                    width={'75px'}
                    height={'auto'}
                    objectFit="cover"
                  />
                ) : (
                  <ImageIcon width={'50px'} height={'50px'} />
                )}
                <Text textAlign="center" mt={1}>
                  Upload image that is not more than 2mb
                </Text>
                <Button
                  flex={1}
                  colorScheme="primary"
                  variant={'link'}
                  px={0}
                  style={{ display: 'flex' }}
                  onClick={hanldeSelectBanner}
                  textDecoration="underline"
                >
                  {currentAccount?.preferences?.banner_url
                    ? 'Upload new banner'
                    : 'Upload banner'}
                </Button>
              </VStack>
            </VStack>
          </FormControl>
          <FormControl py={3}>
            <FormLabel>Status message (optional)</FormLabel>
            <Textarea
              value={description}
              placeholder="Add an optional message to be displayed on your public calendar page"
              onChange={e => setDescription(e.target.value)}
            />
          </FormControl>

          <HStack>
            <FormControl py={3}>
              <FormLabel>Twitter (optional)</FormLabel>
              <Input
                value={twitter}
                type="text"
                placeholder="Twitter"
                onChange={e => setTwitter(e.target.value)}
              />
            </FormControl>

            <FormControl py={3}>
              <FormLabel>Telegram (optional)</FormLabel>
              <Input
                value={telegram}
                type="text"
                placeholder="Telegram"
                onChange={e => setTelegram(e.target.value)}
              />
            </FormControl>
          </HStack>

          <Button
            mt={8}
            isLoading={loading}
            colorScheme="primary"
            onClick={saveDetails}
          >
            Save details
          </Button>
        </>
      </Block>

      <EditBannerImageModal
        isDialogOpen={isEditBannerImageModalOpen}
        onDialogClose={closeEditBannerImageModal}
        imageSrc={selectedImageUrl || ''}
        accountAddress={currentAccount?.address}
        changeBanner={(url: string, bannerSetting: BannerSetting) => {
          currentAccount.preferences.banner_url = url
          currentAccount.preferences.banner_setting = bannerSetting
          void login(currentAccount)
          closeEditBannerImageModal()
        }}
      />
      <BannerPreviewModal
        isDialogOpen={isBannerPreviewModalOpen}
        onDialogClose={closeBannerPreviewModal}
      />
    </VStack>
  )
}

export default AccountDetails
