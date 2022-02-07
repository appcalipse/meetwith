import { Badge, Center, InputProps, Link } from '@chakra-ui/react'
import { FaTimes } from 'react-icons/fa'

const styles = {
  badge: {
    paddingLeft: '8px',
    paddingRight: '8px',
    bg: '#718096',
    color: 'white',
    textTransform: 'none',
    borderRadius: 6,
    fontWeight: 'normal',
    margin: '0 4px',
  },
  close: {
    color: 'white',
    width: '12px',
    padding: 0,
    marginLeft: '4px',
  },
}

export interface BadgeChipProps {
  onRemove?: () => void
  allowRemove?: boolean
  children: any
  size?: InputProps['size']
}

export const BadgeChip: React.FC<BadgeChipProps> = ({
  onRemove = () => {},
  size = 'xs',
  allowRemove,
  children,
}) => {
  const closeButton = (
    <Link
      sx={styles.close}
      size={size}
      variant={'unstyled'}
      aria-label={`Remove Entry`}
      onClick={onRemove}
    >
      <FaTimes />
    </Link>
  )
  return (
    <Badge sx={styles.badge}>
      <Center>
        {children}
        {allowRemove && closeButton}
      </Center>
    </Badge>
  )
}
