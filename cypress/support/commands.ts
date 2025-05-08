/// <reference types="cypress" />
// Import Synpress commands for MetaMask
import { synpressCommandsForMetaMask } from '@synthetixio/synpress/cypress/support'

// Extend Cypress Chainable interface to include custom commands
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      eventExists(
        scheduler_address: string,
        meeting_id: string
      ): Chainable<boolean>
    }
  }
}

synpressCommandsForMetaMask()

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
Cypress.on('uncaught:exception', (err, runnable) => {
  // eslint-disable-next-line no-restricted-syntax
  console.log(err, runnable)
  // returning false here prevents Cypress from
  // failing the test
  return false
})
// Confirm, if a specific event exists in the schedule
Cypress.Commands.add(
  'eventExists',
  (scheduler_address: string, meeting_id: string) => {
    // Send a GET request (you can override method and options if needed)
    return cy
      .request({
        method: 'GET',
        url: '/api/server/calendar_integrations/google/event_exists',
        headers: {
          'X-Server-Secret': Cypress.env('TEST_ACCOUNT_IDENTIFIER'),
          'Content-Type': 'application/json',
        },
        body: {
          scheduler_address,
          meeting_id,
        },
      })
      .then(response => {
        expect(response.status).to.equal(200)
        expect(response.body).to.equal(true)
        return response.body
      })
  }
)
