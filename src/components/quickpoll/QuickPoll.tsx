import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { FaCalendarAlt, FaClock, FaLink } from 'react-icons/fa'
import { FaUsers } from 'react-icons/fa6'
import CustomLoading from '@/components/CustomLoading'
import { Account } from '@/types/Account'
import { getQuickPolls } from '@/utils/api_helper'
import { QUICKPOLL_MIN_LIMIT } from '@/utils/constants'
import { handleApiError } from '@/utils/error_helper'
import AllPolls from './AllPolls'
import QuickPollIntroScreen from './QuickPollIntroScreen'

interface QuickPollProps {
  currentAccount: Account
}

const QuickPoll = ({ currentAccount: _currentAccount }: QuickPollProps) => {
  const { push } = useRouter()

  // Check if user has existing polls
  const { data: pollsData, isLoading } = useQuery({
    queryKey: ['quickpolls-check'],
    queryFn: () => getQuickPolls(QUICKPOLL_MIN_LIMIT, 0),
    onError: (err: unknown) => {
      handleApiError('Failed to check polls', err)
    },
  })

  if (isLoading) {
    return <CustomLoading text="Loading polls..." />
  }

  const hasExistingPolls = (pollsData?.polls?.length || 0) > 0
  const canCreateQuickPoll = !pollsData?.upgradeRequired

  // If user has existing polls
  if (hasExistingPolls) {
    return <AllPolls />
  }

  return (
    <QuickPollIntroScreen
      onCreate={() => push(`/dashboard/create-poll`)}
      ctaText="Run new poll"
      ctaDisabled={!canCreateQuickPoll}
      ctaTitle={
        !canCreateQuickPoll
          ? 'Upgrade to Pro to create more active polls'
          : undefined
      }
      compact={false}
      cards={[
        {
          icon: FaCalendarAlt,
          title: 'Create a poll',
          description: 'Set up your meeting details and available time slots',
        },
        {
          icon: FaUsers,
          title: 'Add participants from existing groups and from your contact',
          description: 'Include people from your groups and contacts',
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

export default QuickPoll
