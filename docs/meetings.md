# Meetings Structure

A meeting in MWW is a mix of two things:

- **public information**: i.e. the time that it will happen
- **sensitive information**: i.e. with whom it will happen, description and so on

You will be able to see such details in the `DBSlot` class, it is something like this:

```ts
export interface TimeSlot {
  start: Date
  end: Date
}

export interface DBSlot extends TimeSlot {
  id?: string
  created_at?: Date
  account_address: string
  version: number
  meeting_info_encrypted: Encrypted
}
```

You can see both types of information here, the public one and the sensitive one that is stored encrypted in `meeting_info_encrypted` property.

## Encryption

Encryption in MWW always happens on the client side, because that's the only moment in which we have the user signature available, so everything must be done in a way that we have the required data to perform actions but we still respect the user privacy.

That's totally intentional, that way the user is the owner of his information and only he can decide to use it or change it.

So in order to create a meeting, we have to encode on the client side the sensitive information, and send to the backend only the required to work.

This is what the sensitive information looks like:

```ts
export interface MeetingDecrypted {
  id: string
  created_at: Date
  start: Date
  end: Date
  participants: ParticipantInfo[]
  meeting_url: string
  content?: string
  related_slot_ids: string[]
  version: DBSlot['version']
}
```

Note that we have a list of other participants in the meeting, but we also have these participants `related_slot_ids` and `version` properties.

## Related Slots

Everytime a meeting is created, we create a `DBSlot` for each participant. If one of these participantes decides to change the meeting (by refusing, adding more people etc...) we need to be able to find the other related slots to perform the changes (given that they have the exact same data, but related to the other participant).

That's when `related_slot_ids` comes into play, and we take care of the required changes directly on the `calendar_manager.ts` module.

Everytime a meeting is changed, we have some options:

- user was removed: the related slot will be deleted
- user was added: a new `DBSlot` will be created with the required info
- user was kept: the existing `DBSlot` will be edited, so the contents will reflect the new data, but the slot id will not change

# Versioning

Note that any way reflects in changing every `DBSlot` related to the meeting giving that we store the other related slot ids in the meeting sensitive fields.

That makes it possible to have conflicts, imagine the following scenario:

1. user A creates a meeting with user B
2. user B accepts the meeting
3. at the same time that user B is accepting, user A is changing the time of the meeting

Given that the same `DBSlots` will be changed at the same time, we risk loosing information.

To solve this, we try to use some type of Optimistic Locking (we try because supabase doesn't helps us here). Every `DBSlot` has a `version` property, everytime a user changes the meeting, not only his data but all the other data related to the meeting will have it's version increased.

Given that we have to load things in the frontend, we store the version that we are using as the baseline, and in the backend before each change we check if the versions still match, if it doesn't then it means that other participant already have changed the meeting and we have to reload the page to fetch the most recent data.
