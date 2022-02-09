import * as Sentry from '@sentry/browser'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, calendar_v3, google } from 'googleapis'

import {
  ConnectedCalendarProvider,
  NewCalendarEventType,
} from '../../types/CalendarConnections'
import { DBSlot, MeetingDecrypted } from '../../types/Meeting'
import { updateConnectedCalendarPayload } from '../api_helper'
import { apiUrl } from '../constants'
import { changeConnectedCalendarSync } from '../database'
import { MWWGoogleAuth } from './google_auth'

export interface Calendar {
  createEvent(event: MeetingDecrypted): Promise<NewCalendarEventType>
}

export default class GoogleCalendarService implements Calendar {
  private url = ''
  private integrationName = ''
  private auth: { getToken: () => Promise<MWWGoogleAuth> }

  constructor(
    address: string,
    email: string,
    credential: Auth.Credentials | string
  ) {
    this.integrationName = ConnectedCalendarProvider.GOOGLE
    this.auth = this.googleAuth(
      address,
      email,
      typeof credential === 'string' ? JSON.parse(credential) : credential
    )
  }

  private googleAuth = (
    address: string,
    email: string,
    googleCredentials: Auth.Credentials
  ) => {
    const [client_secret, client_id] = [
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_CLIENT_ID!,
    ]
    const redirect_uri = `${apiUrl}/secure/calendar_integrations/google/callback`

    const myGoogleAuth = new MWWGoogleAuth(
      client_id,
      client_secret,
      redirect_uri
    )
    myGoogleAuth.setCredentials(googleCredentials)

    const isExpired = () => myGoogleAuth.isTokenExpiring()

    const refreshAccessToken = () =>
      myGoogleAuth
        .refreshToken(googleCredentials.refresh_token)
        .then((res: GetTokenResponse) => {
          const token = res.res?.data
          googleCredentials.access_token = token.access_token
          googleCredentials.expiry_date = token.expiry_date

          return changeConnectedCalendarSync(
            address,
            email,
            ConnectedCalendarProvider.GOOGLE,
            undefined,
            googleCredentials
          ).then(() => {
            console.log('token updated')
            myGoogleAuth.setCredentials(googleCredentials)
            return myGoogleAuth
          })
        })
        .catch(err => {
          Sentry.captureException(err)
          console.error(err)
          return myGoogleAuth
        })

    return {
      getToken: () =>
        !isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken(),
    }
  }

  async createEvent(event: MeetingDecrypted): Promise<NewCalendarEventType> {
    return new Promise((resolve, reject) =>
      this.auth.getToken().then(myGoogleAuth => {
        console.log('CREATING EVENT ON GOOGLE')
        const payload: calendar_v3.Schema$Event = {
          summary: 'Meet With Wallet Scheduled Event', // TODO: implement
          description: event.content || 'A meeting description', // TODO: implement
          start: {
            dateTime: new Date(event.start).toISOString(),
            timeZone: 'UTC', // TODO: implement
          },
          end: {
            dateTime: new Date(event.end).toISOString(),
            timeZone: 'UTC', // TODO: implement
          },
          attendees: [], // TODO: implement
          reminders: {
            useDefault: false,
            overrides: [{ method: 'email', minutes: 10 }],
          },
        }

        // is this required?
        if (event.meeting_url) {
          payload['location'] = event.meeting_url
        }

        // if (event.meeting_url) {
        //   payload["conferenceData"] = event.mee;
        // }

        const calendar = google.calendar({
          version: 'v3',
          auth: myGoogleAuth,
        })
        console.log('inserting')
        calendar.events.insert(
          {
            auth: myGoogleAuth,
            calendarId: 'primary',
            requestBody: payload,
            conferenceDataVersion: 1,
          },
          function (err, event) {
            if (err || !event?.data) {
              console.error(
                'There was an error contacting google calendar service: ',
                err
              )
              console.error(err)
              return reject(err)
            }
            return resolve({
              uid: '',
              ...event.data,
              id: event.data.id || '',
              additionalInfo: {
                hangoutLink: event.data.hangoutLink || '',
              },
              type: 'google_calendar',
              password: '',
              url: '',
            })
          }
        )
      })
    )
  }

  //   async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
  //     // return new Promise((resolve, reject) =>
  //     //   this.auth.getToken().then((myGoogleAuth) => {
  //     //     const payload: calendar_v3.Schema$Event = {
  //     //       summary: event.title,
  //     //       description: getRichDescription(event),
  //     //       start: {
  //     //         dateTime: event.startTime,
  //     //         timeZone: event.organizer.timeZone,
  //     //       },
  //     //       end: {
  //     //         dateTime: event.endTime,
  //     //         timeZone: event.organizer.timeZone,
  //     //       },
  //     //       attendees: event.attendees,
  //     //       reminders: {
  //     //         useDefault: true,
  //     //       },
  //     //     };

  //     //     if (event.location) {
  //     //       payload["location"] = getLocation(event);
  //     //     }

  //     //     const calendar = google.calendar({
  //     //       version: "v3",
  //     //       auth: myGoogleAuth,
  //     //     });
  //     //     calendar.events.update(
  //     //       {
  //     //         auth: myGoogleAuth,
  //     //         calendarId: event.destinationCalendar?.externalId
  //     //           ? event.destinationCalendar.externalId
  //     //           : "primary",
  //     //         eventId: uid,
  //     //         sendNotifications: true,
  //     //         sendUpdates: "all",
  //     //         requestBody: payload,
  //     //       },
  //     //       function (err, event) {
  //     //         if (err) {
  //     //           console.error("There was an error contacting google calendar service: ", err);

  //     //           return reject(err);
  //     //         }
  //     //         return resolve(event?.data);
  //     //       }
  //     //     );
  //     //   })
  //     // );
  //   }

  //   async deleteEvent(uid: string, event: CalendarEvent): Promise<void> {
  //     // return new Promise((resolve, reject) =>
  //     //   this.auth.getToken().then((myGoogleAuth) => {
  //     //     const calendar = google.calendar({
  //     //       version: "v3",
  //     //       auth: myGoogleAuth,
  //     //     });
  //     //     calendar.events.delete(
  //     //       {
  //     //         auth: myGoogleAuth,
  //     //         calendarId: event.destinationCalendar?.externalId
  //     //           ? event.destinationCalendar.externalId
  //     //           : "primary",
  //     //         eventId: uid,
  //     //         sendNotifications: true,
  //     //         sendUpdates: "all",
  //     //       },
  //     //       function (err, event) {
  //     //         if (err) {
  //     //           console.error("There was an error contacting google calendar service: ", err);
  //     //           return reject(err);
  //     //         }
  //     //         return resolve(event?.data);
  //     //       }
  //     //     );
  //     //   })
  //     // );
  //   }

  //   async getAvailability(
  //     dateFrom: string,
  //     dateTo: string,
  //     selectedCalendars: IntegrationCalendar[]
  //   ): Promise<EventBusyDate[]> {
  //     // return new Promise((resolve, reject) =>
  //     //   this.auth.getToken().then((myGoogleAuth) => {
  //     //     const calendar = google.calendar({
  //     //       version: "v3",
  //     //       auth: myGoogleAuth,
  //     //     });
  //     //     const selectedCalendarIds = selectedCalendars
  //     //       .filter((e) => e.integration === this.integrationName)
  //     //       .map((e) => e.externalId);
  //     //     if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
  //     //       // Only calendars of other integrations selected
  //     //       resolve([]);
  //     //       return;
  //     //     }

  //     //     (selectedCalendarIds.length === 0
  //     //       ? calendar.calendarList
  //     //           .list()
  //     //           .then((cals) => cals.data.items?.map((cal) => cal.id).filter(Boolean) || [])
  //     //       : Promise.resolve(selectedCalendarIds)
  //     //     )
  //     //       .then((calsIds) => {
  //     //         calendar.freebusy.query(
  //     //           {
  //     //             requestBody: {
  //     //               timeMin: dateFrom,
  //     //               timeMax: dateTo,
  //     //               items: calsIds.map((id) => ({ id: id })),
  //     //             },
  //     //           },
  //     //           (err, apires) => {
  //     //             if (err) {
  //     //               reject(err);
  //     //             }
  //     //             let result: Prisma.PromiseReturnType<CalendarService["getAvailability"]> = [];

  //     //             if (apires?.data.calendars) {
  //     //               result = Object.values(apires.data.calendars).reduce((c, i) => {
  //     //                 i.busy?.forEach((busyTime) => {
  //     //                   c.push({
  //     //                     start: busyTime.start || "",
  //     //                     end: busyTime.end || "",
  //     //                   });
  //     //                 });
  //     //                 return c;
  //     //               }, [] as typeof result);
  //     //             }
  //     //             resolve(result);
  //     //           }
  //     //         );
  //     //       })
  //     //       .catch((err) => {
  //     //         this.log.error("There was an error contacting google calendar service: ", err);

  //     //         reject(err);
  //     //       });
  //     //   })
  //     // );
  //   }

  //   async listCalendars(): Promise<IntegrationCalendar[]> {
  //     // return new Promise((resolve, reject) =>
  //     //   this.auth.getToken().then((myGoogleAuth) => {
  //     //     const calendar = google.calendar({
  //     //       version: "v3",
  //     //       auth: myGoogleAuth,
  //     //     });

  //     //     calendar.calendarList
  //     //       .list()
  //     //       .then((cals) => {
  //     //         resolve(
  //     //           cals.data.items?.map((cal) => {
  //     //             const calendar: IntegrationCalendar = {
  //     //               externalId: cal.id ?? "No id",
  //     //               integration: this.integrationName,
  //     //               name: cal.summary ?? "No name",
  //     //               primary: cal.primary ?? false,
  //     //             };
  //     //             return calendar;
  //     //           }) || []
  //     //         );
  //     //       })
  //     //       .catch((err: Error) => {
  //     //         this.log.error("There was an error contacting google calendar service: ", err);

  //     //         reject(err);
  //     //       });
  //     //   })
  //     // );
  //   }
}
