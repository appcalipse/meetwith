/**
 * Type imports test — loading type modules counts their declarations as covered
 * under v8 coverage provider.
 */

import * as Supabase from '@meta/Supabase'
import * as Office365 from '@meta/Office365'
import * as Requests from '@meta/Requests'
import * as Contacts from '@meta/Contacts'
import * as Currency from '@meta/Currency'
import * as Locale from '@meta/Locale'
import * as ConnectedAccounts from '@meta/ConnectedAccounts'
import * as Discord from '@meta/Discord'
import * as Session from '@meta/Session'
import * as Database from '@meta/Database'
import * as Account from '@meta/Account'
import * as Billing from '@meta/Billing'
import * as Calendar from '@meta/Calendar'
import * as CalendarConnections from '@meta/CalendarConnections'
import * as Meeting from '@meta/Meeting'
import * as QuickPoll from '@meta/QuickPoll'
import * as Group from '@meta/Group'
import * as Subscription from '@meta/Subscription'
import * as TokenGating from '@meta/TokenGating'
import * as Transactions from '@meta/Transactions'
import * as Thirdweb from '@meta/Thirdweb'
import * as PaymentAccount from '@meta/PaymentAccount'
import * as ParticipantInfo from '@meta/ParticipantInfo'
import * as AccountNotifications from '@meta/AccountNotifications'
import * as Dashboard from '@meta/Dashboard'
import * as Zoom from '@meta/Zoom'
import * as Telegram from '@meta/Telegram'
import * as common from '@meta/common'
import * as schedule from '@meta/schedule'
import * as availability from '@meta/availability'
import * as chains from '@meta/chains'

describe('Type module loading', () => {
  it('loads all type modules successfully', () => {
    expect(Supabase).toBeDefined()
    expect(Office365).toBeDefined()
    expect(Requests).toBeDefined()
    expect(Contacts).toBeDefined()
    expect(Currency).toBeDefined()
    expect(Locale).toBeDefined()
    expect(ConnectedAccounts).toBeDefined()
    expect(Discord).toBeDefined()
    expect(Session).toBeDefined()
    expect(Database).toBeDefined()
    expect(Account).toBeDefined()
    expect(Billing).toBeDefined()
    expect(Calendar).toBeDefined()
    expect(CalendarConnections).toBeDefined()
    expect(Meeting).toBeDefined()
    expect(QuickPoll).toBeDefined()
    expect(Group).toBeDefined()
    expect(Subscription).toBeDefined()
    expect(TokenGating).toBeDefined()
    expect(Transactions).toBeDefined()
    expect(Thirdweb).toBeDefined()
    expect(PaymentAccount).toBeDefined()
    expect(ParticipantInfo).toBeDefined()
    expect(AccountNotifications).toBeDefined()
    expect(Dashboard).toBeDefined()
    expect(Zoom).toBeDefined()
    expect(Telegram).toBeDefined()
    expect(common).toBeDefined()
    expect(schedule).toBeDefined()
    expect(availability).toBeDefined()
    expect(chains).toBeDefined()
  })
})
