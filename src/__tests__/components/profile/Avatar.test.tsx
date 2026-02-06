import { render, screen } from '@testing-library/react'
import { Avatar } from '@/components/profile/components/Avatar'

jest.mock('@ukstv/jazzicon-react', () => ({
  Jazzicon: ({ address }: { address: string }) => <div data-testid="jazzicon">{address}</div>,
}))

describe('Avatar Component', () => {
  it('should render ChakraAvatar when avatar_url is provided', () => {
    const { container } = render(
      <Avatar avatar_url="https://example.com/avatar.jpg" name="Test User" />
    )
    const avatar = container.querySelector('img')
    expect(avatar).toBeInTheDocument()
  })

  it('should render Jazzicon when no avatar_url is provided', async () => {
    render(<Avatar address="0x1234567890abcdef" />)
    const jazzicon = await screen.findByTestId('jazzicon')
    expect(jazzicon).toBeInTheDocument()
  })

  it('should pass address to Jazzicon', async () => {
    const address = '0x1234567890abcdef'
    render(<Avatar address={address} />)
    const jazzicon = await screen.findByTestId('jazzicon')
    expect(jazzicon).toHaveTextContent(address)
  })

  it('should use empty string for Jazzicon when no address provided', async () => {
    render(<Avatar />)
    const jazzicon = await screen.findByTestId('jazzicon')
    expect(jazzicon).toBeInTheDocument()
  })

  it('should prefer avatar_url over address', () => {
    const { container } = render(
      <Avatar 
        avatar_url="https://example.com/avatar.jpg" 
        address="0x1234567890abcdef"
        name="Test User"
      />
    )
    const avatar = container.querySelector('img')
    expect(avatar).toBeInTheDocument()
  })
})
