import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import MeetSlotPicker from '../components/MeetSlotPicker';
import { AccountContext } from '../providers/AccountProvider';
import { isSlotAvailable, scheduleMeeting } from '../utils/calendar_manager';
import dayjs from 'dayjs';
import { MeetingEncrypted } from '../types/Meeting';
import { getAccount, getMeeting, getMeetings } from '../utils/api_helper';

const Schedule: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    const address = router.query.address as string;
    if (address) {
      checkUser(address);
    }
  }, [router.query]);

  const [account, setAccount] = useState(null as string | null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [meetings, setMeetings] = useState([] as MeetingEncrypted[]);

  const { currentAccount, logged } = useContext(AccountContext);

  const checkUser = async (identifier: string) => {
    try {
      getMeeting('e65d9e89-709d-4c90-8647-e5afa1a746a0');
      const account = await getAccount(identifier);
      setAccount(account.address);
      updateMeetings(account.address);
      setLoading(false);
    } catch (e) {
      //TODO handle error
      console.log(e);
      //router.push('/404')
    }
  };

  const confirmSchedule = async (startTime: Date) => {
    if (logged) {
      const start = dayjs(startTime);
      const end = dayjs(startTime).add(15, 'minute');
      await scheduleMeeting(
        currentAccount!.address,
        account!,
        start,
        end,
        'testing'
      );
    } else {
      //TODO: provide feedback to log
    }
  };

  const updateMeetings = async (identifier: string) => {
    const monthStart = dayjs(currentMonth).startOf('month');
    const monthEnd = dayjs(currentMonth).endOf('month');

    const meetings = await getMeetings(
      identifier,
      monthStart.toDate(),
      monthEnd.toDate()
    );

    setMeetings(meetings);
  };

  useEffect(() => {
    account && updateMeetings(account);
  }, [currentMonth]);

  const validateSlot = (slot: Date): boolean => {
    return isSlotAvailable(30, slot, meetings);
  };

  return loading ? (
    <div>Loading...</div>
  ) : (
    <div>
      <div>
        <MeetSlotPicker
          onMonthChange={(day: Date) => setCurrentMonth(day)}
          onSchedule={confirmSchedule}
          slotDurationInMinutes={30}
          timeSlotAvailability={validateSlot}
        />
      </div>
      Wallet: {account}
    </div>
  );
};

export default Schedule;
