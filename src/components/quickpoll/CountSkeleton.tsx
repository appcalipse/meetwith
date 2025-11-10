import { Skeleton } from '@chakra-ui/react'

const CountSkeleton = () => (
  <Skeleton
    height="14px"
    width="14px"
    borderRadius="4px"
    display="inline-block"
    opacity={0.4}
  />
)

export default CountSkeleton
