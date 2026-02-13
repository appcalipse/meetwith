import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Image,
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
  useToast,
  VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop/types'

import { uploadGroupAvatar } from '@/utils/api_helper'
import { handleApiError } from '@/utils/error_helper'
import { getCroppedImg } from '@/utils/image-utils'

interface IGroupAvatarUploadProps {
  isDialogOpen: boolean
  onDialogClose: () => void
  imageSrc: string | undefined
  groupId: string
  onAvatarChange: (imageUrl: string) => void
}

const GroupAvatarUpload: React.FC<IGroupAvatarUploadProps> = props => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isCropping, setIsCropping] = useState(false)

  const showCroppedImage = async () => {
    setIsCropping(true)
    if (croppedAreaPixels && props.imageSrc) {
      try {
        const cropped = await getCroppedImg(props.imageSrc, croppedAreaPixels)
        setCroppedImage(cropped)
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
      const formData = new FormData()
      formData.append(
        'avatar',
        blob,
        `cropped-avatar-${props.groupId}.${blob.type.split('/')[1]}`
      )
      const url = await uploadGroupAvatar(props.groupId, formData)
      props.onAvatarChange(url)
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
      >
        <ModalHeader w={'100%'} pos={'relative'}>
          Edit Group Avatar
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
            <Box height={{ base: 200, md: 400 }} w="100%" pos={'relative'}>
              <Image
                src={croppedImage}
                alt="Cropped"
                height={{ base: 200, md: 400 }}
                width={{ base: 200, md: 400 }}
                rounded={'50%'}
                mx={'auto'}
              />
            </Box>
            <Button
              onClick={handleSave}
              colorScheme="primary"
              mt={2}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </VStack>
        ) : (
          <VStack gap={4} pb={4}>
            <Box height={{ base: 200, md: 400 }} w="100%" pos={'relative'}>
              <Cropper
                image={props.imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
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
                  colorScheme="primary"
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

export default GroupAvatarUpload
