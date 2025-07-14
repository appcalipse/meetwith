import {
  Box,
  Button,
  HStack,
  Image,
  Modal,
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
import { saveAvatar } from '@utils/api_helper'
import { getCroppedImg } from '@utils/image-utils'
import React, { useState } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop/types'

interface IEditImageModalProps {
  isDialogOpen: boolean
  onDialogClose: () => void
  imageSrc: string | undefined
  accountAddress: string | undefined
  changeAvatar: (image: string) => void
}

const EditImageModal = (props: IEditImageModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const showCroppedImage = async () => {
    if (croppedAreaPixels && props.imageSrc) {
      try {
        const croppedImage = await getCroppedImg(
          props.imageSrc,
          croppedAreaPixels
        )
        // console.log('donee', { croppedImage })
        setCroppedImage(croppedImage)
      } catch (e) {
        console.error(e)
      }
    }
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
        'avatar',
        blob,
        `cropped-avatar-${props.accountAddress}.jpg`
      )
      const url = await saveAvatar(formdata, props.accountAddress as string)
      if (url) {
        props.changeAvatar(url)
      } else {
        toast({
          title: 'Error saving image',
          description:
            'There was an error saving your image. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    } catch (e) {
    } finally {
      setCroppedImage(null)
      setCroppedAreaPixels(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      props.onDialogClose()
    }
    setSaving(false)
  }
  return (
    <Modal
      blockScrollOnMount={false}
      isOpen={props.isDialogOpen}
      onClose={props.onDialogClose}
      isCentered
    >
      <ModalOverlay />
      <ModalContent
        backgroundColor={'neutral.900'}
        color={'neutral.200'}
        pb={4}
      >
        <ModalHeader>Edit Image</ModalHeader>
        {croppedImage ? (
          <VStack>
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
              <Button onClick={showCroppedImage} colorScheme="primary">
                Apply Crop
              </Button>
            </VStack>
          </VStack>
        )}
      </ModalContent>
    </Modal>
  )
}

export default EditImageModal
