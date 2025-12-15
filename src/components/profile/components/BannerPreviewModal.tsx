import {
  Box,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'

import UserBannerBrowser from '@/components/og-images/BannerBrowser'
import useAccountContext from '@/hooks/useAccountContext'
import { getAccountDomainUrl } from '@/utils/calendar_manager'
import { appUrl } from '@/utils/constants'

interface IBannerPreviewModalProps {
  isDialogOpen: boolean
  onDialogClose: () => void
}

const BannerPreviewModal = (props: IBannerPreviewModalProps) => {
  const currentAccount = useAccountContext()

  const handleClose = () => {
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
          <Box h={4}>
            <ModalCloseButton
              size={'xl'}
              my={2}
              mr={4}
              insetY={0}
              px={2}
              _hover={{
                bg: 'none',
              }}
            />
          </Box>
        </ModalHeader>
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
            banner_url={currentAccount?.preferences?.banner_url || ''}
            avatar_url={currentAccount?.preferences?.avatar_url || ''}
            calendar_url={`${appUrl}/${getAccountDomainUrl(currentAccount)}`}
            description={currentAccount?.preferences?.description || ''}
            owner_account_address={currentAccount?.address || ''}
            name={currentAccount?.preferences.name || ''}
          />
        </Box>
      </ModalContent>
    </Modal>
  )
}

export default BannerPreviewModal
