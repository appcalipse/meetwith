import { useRouter } from 'next/router'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'
import QuickPollIntroScreen from './QuickPollIntroScreen'

const PublicPollsList = () => {
  const router = useRouter()

  return (
    <QuickPollIntroScreen
      onCreate={() => router.push('/quickpoll/create')}
      ctaText="Create new poll"
      headerVariant="allPolls"
      headerTitle="Quick Poll for Groups"
      headerSubtitle="Coordinate availability across teams without the email chains"
      compact
      bottomPadding={32}
      cards={[
        {
          icon: FaCalendarAlt,
          title: 'Create a poll',
          description: 'Set up your meeting details and available time slots',
        },
        {
          icon: FaUsers,
          title: 'Add participants with their emails',
          description: 'Invite participants by entering their email addresses',
        },
        {
          icon: FaLink,
          title: 'Share public link for others to provide their availability',
          description:
            'Send a public link for others to enter their free times',
        },
        {
          icon: FaClock,
          title: 'Schedule meeting',
          description: 'Review responses and finalise the meeting time',
        },
      ]}
    />
  )
}

export default PublicPollsList
