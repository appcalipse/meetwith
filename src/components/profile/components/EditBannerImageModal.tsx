import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  HStack,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { saveBanner } from '@utils/api_helper'
import { handleApiError } from '@utils/error_helper'
import { getCroppedImgRec } from '@utils/image-utils'
import { ChangeEvent, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop/types'

import UserBannerBrowser from '@/components/og-images/BannerBrowser'
import useAccountContext from '@/hooks/useAccountContext'
import { BannerSetting } from '@/types/Account'
import { getAccountDomainUrl } from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'

interface IEditBannerImageModalProps {
  isDialogOpen: boolean
  onDialogClose: () => void
  imageSrc: string | undefined
  accountAddress: string | undefined
  changeBanner: (image: string, bannerSetting: BannerSetting) => void
}

const EditBannerImageModal = (props: IEditBannerImageModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [bannerSetting, setBannerSetting] = useState<BannerSetting>({
    show_avatar: true,
    show_description: true,
  })
  const handleBannerSettingChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof BannerSetting
    const state = e.target.checked
    setBannerSetting(prevState => ({
      ...prevState,
      [name]: state,
    }))
  }
  const currentAccount = useAccountContext()
  const showCroppedImage = async () => {
    setIsCropping(true)
    if (croppedAreaPixels && props.imageSrc) {
      try {
        const croppedImage = await getCroppedImgRec(
          props.imageSrc,
          croppedAreaPixels
        )
        setCroppedImage(croppedImage)
      } catch (e) {
        console.error(e)
      }
    }
    setIsCropping(false)
  }
  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }
  const handleSave = async () => {
    setSaving(true)
    try {
      if (!croppedImage) return

      const response = await fetch(croppedImage)
      const blob = await response.blob()
      const formdata = new FormData()
      formdata.append(
        'banner',
        blob,
        `cropped-avatar-${props.accountAddress}.${blob.type.split('/')[1]}`
      )
      formdata.append('banner_setting', JSON.stringify(bannerSetting))
      const url = await saveBanner(formdata, props.accountAddress as string)
      props.changeBanner(url, bannerSetting)
      handleClose()
    } catch (e: unknown) {
      handleApiError('Error saving cropped image', e)
    }
    setSaving(false)
  }
  const handleClose = () => {
    setCroppedImage(null)
    setCroppedAreaPixels(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    props.onDialogClose()
  }
  return (
    <Modal
      blockScrollOnMount={false}
      isOpen={props.isDialogOpen}
      onClose={handleClose}
      isCentered
    >
      <ModalOverlay />
      <ModalContent
        backgroundColor={'neutral.900'}
        color={'neutral.200'}
        pb={4}
        w="fit-content"
        maxW="fit-content"
      >
        <ModalHeader w={'100%'} pos={'relative'}>
          {croppedImage ? 'Preview Banner' : 'Edit Banner'}
          <Box>
            <ModalCloseButton
              size={'xl'}
              my={'auto'}
              mr={4}
              insetY={0}
              px={2}
              _hover={{
                bg: 'none',
              }}
            />
          </Box>
        </ModalHeader>
        {croppedImage ? (
          <VStack w={'100%'} p={4}>
            <HStack
              alignSelf={'flex-start'}
              color={'primary.400'}
              onClick={() => setCroppedImage(null)}
              left={6}
              w={'fit-content'}
              cursor="pointer"
              role={'button'}
            >
              <ArrowBackIcon w={6} h={6} />
              <Text fontSize={16}>Back</Text>
            </HStack>
            <Box
              w="100%"
              pos={'relative'}
              width={{
                base: '400px',
                md: '800px',
                lg: '1000px',
                '2xl': '1200px',
              }}
              height={{
                base: '210px',
                md: '420px',
                lg: '525px',
                '2xl': '630px',
              }}
            >
              <UserBannerBrowser
                banner_url={croppedImage}
                avatar_url={currentAccount?.preferences?.avatar_url || ''}
                calendar_url={`${appUrl}/${getAccountDomainUrl(
                  currentAccount
                )}`}
                description={currentAccount?.preferences?.description || ''}
                owner_account_address={currentAccount?.address || ''}
                name={currentAccount?.preferences.name || ''}
                banner_setting={bannerSetting}
              />
            </Box>
            <HStack
              flexWrap={'wrap'}
              w="100%"
              alignItems="center"
              justifyContent="center"
            >
              <Checkbox
                borderRadius={8}
                w="fit-content"
                borderColor={
                  bannerSetting?.show_avatar
                    ? 'border-default-primary'
                    : 'border-inverted-subtle'
                }
                colorScheme="primary"
                isChecked={bannerSetting?.show_avatar}
                onChange={e => handleBannerSettingChange(e)}
                name="show_avatar"
                justifyContent="space-between"
                my="auto"
              >
                <Text
                  fontWeight="600"
                  color={
                    bannerSetting?.show_avatar
                      ? 'border-default-primary'
                      : 'border-inverted-subtle'
                  }
                  cursor="pointer"
                >
                  Show Avatar
                </Text>
              </Checkbox>
              <Checkbox
                borderRadius={8}
                w="fit-content"
                borderColor={
                  bannerSetting?.show_description
                    ? 'border-default-primary'
                    : 'border-inverted-subtle'
                }
                colorScheme="primary"
                isChecked={bannerSetting?.show_description}
                onChange={e => handleBannerSettingChange(e)}
                name="show_description"
                p={4}
                justifyContent="space-between"
              >
                <Text
                  fontWeight="600"
                  color={
                    bannerSetting?.show_description
                      ? 'border-default-primary'
                      : 'border-inverted-subtle'
                  }
                  cursor="pointer"
                >
                  Show Description
                </Text>
              </Checkbox>
              <Button
                onClick={handleSave}
                colorScheme="primary"
                mt={2}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </HStack>
          </VStack>
        ) : (
          <VStack gap={4} pb={4} minW={350} p={4}>
            <Box
              height={{ base: 200, md: 400 }}
              w={{ base: 350, md: 800 }}
              pos={'relative'}
            >
              <Cropper
                image={props.imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1160 / 605}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="rect"
              />
            </Box>
            <VStack w={'100%'}>
              <HStack>
                <Text variant="overline">Zoom</Text>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={zoom => setZoom(zoom)}
                />
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={zoom => setZoom(zoom)}
                  colorScheme="primary"
                  defaultValue={30}
                  minW={200}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </HStack>
              <Button
                onClick={showCroppedImage}
                colorScheme="primary"
                isLoading={isCropping}
              >
                Apply Crop
              </Button>
            </VStack>
          </VStack>
        )}
      </ModalContent>
    </Modal>
  )
}

export default EditBannerImageModal
