import { Box } from '@chakra-ui/layout'

import UserBannerBrowser from '@/components/og-images/BannerBrowser'

const ComponentName = () => {
  return (
    <Box m={60} width="1000px" height="400px" boxShadow="md">
      <UserBannerBrowser
        avatar_url="https://bagbfrpwoirldohkpvee.supabase.co/storage/v1/object/public/avatars/uploads/1752607228562-cropped-avatar-0x546f67e57a3980f41251b1cace8abd10d764cc3f.webp"
        calendar_url="https://meetwith.xyz/udoks"
        description="This me a wonder!!"
        banner_url={null}
        name="Udochukwuka Onyela"
        owner_account_address="0x546f67e57a3980f41251b1cace8abd10d764cc3f"
      />
    </Box>
  )
}

export default ComponentName
