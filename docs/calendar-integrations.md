# Calendar Integrations

We do integrate with external calendars in two specific moments:

1. When a user opens the public calendar and goes to the time selection, we check the connected calendars slots
2. When a user schedules a new meeting, we propagate the meeting to every configured calendar

As of today, we support 2 types of integrations:

- OAuth integrations: google and office365
- CalDav integrations: iCloud and Generic CalDav Providers

## Basic Structure

A `CalendarIntegration` is a object that holds information about the account that the calendar is connected, and ths information required to integrate with that service. Also, the user can choose how a connected calendar will be used:

- if it will be used only by a source of availabilities
- if it will receive events created

This functionality is only available for pro accounts. A user can have an unlimited number of connected calendars as of today.

Please take a look at the module `utils/sync_helper.ts` to understand how events are synced for every event. Also, you can look at `utils/services/*/ts` to understand how each service is integrated, given that we already have the required data to integrate with it.

## OAuth Integrations

Some services like google or Office365 offers integrations via oAuth integration. In order for this type of integration to work, we need some things:

- proper api key created and configured in the service provider
- an endpoint to `connect` to the correct provider url, this will create an url to redirect the user
- given that we have a redirect url, that happens and the user gives us the authorization to access their data
- once the authorization is given, we then receive a request from the service provider to the `callback` endpoint

The oAuth endpoints can be found at `src/pages/api/secure/calendar_integrations`.

## CalDAV

Caldav integrations work differently from oAuth integrations. CalDav services basically integrates via REST API, with a really common set of operations and methods.

For Caldav integration to work, we need three things:

- url
- username (usually an email)
- password

So the first step is to make sure that this information is valid uppon registration. For that to work, we have a http method called `PROPFIND` (that we changed to `PUT`because we use CloudFront and it doesn't support `PROPFIND`) ready, so we can test the integration before saving the data.

The user password is stored with cryptography, so no one will have access to it.

You can find the validation endpoint at `src/pages/api/secure/calendar_integrations/webdav.ts`.
