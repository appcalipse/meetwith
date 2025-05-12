/// <reference types="cypress" />
const accountIdentifier = Cypress.env('TEST_ACCOUNT_IDENTIFIER')
context('Actions', () => {
  before(() => {
    cy.visit('/', { timeout: 300000 })
    cy.get('button[aria-controls="ReactQueryDevtoolsPanel"]', {
      timeout: 30000,
    }).click({
      multiple: true,
      force: true,
    })

    cy.get('button[aria-controls="ReactQueryDevtoolsPanel"]')
      .contains('Close')
      .click({ force: true }) // Uncommenting this line

    cy.get('body').then($body => {
      if ($body.find('button:contains("ACCEPT COOKIES")').length > 0) {
        cy.get('button').contains('ACCEPT COOKIES').click({ force: true })
      } else {
        cy.log('Accept Cookies button not found')
      }
    })
    cy.get('button').contains('Sign in').click()
    cy.get('button').contains('MetaMask').click()
    cy.get('p').contains('Connecting')
    cy.confirmSignature()
    cy.url({ timeout: 150000 }).should('match', /dashboard/)
  })
  afterEach(() => {
    // cy.visit('/logout')
  })

  // https://on.cypress.io/interacting-with-elements
  it('Schedule - Guests no availability', () => {
    cy.visit('/test')

    cy.intercept('GET', `/api/meetings/busy/${accountIdentifier}*`).as(
      'busySlots'
    )
    cy.wait(5000)
    /* ==== Generated with Cypress Studio ==== */
    cy.get('[data-testid="invalid-day"]').first().should('exist')
    cy.get('[data-testid="valid-day"]').eq(4).click()
    cy.get('[data-testid="availability"]').first().click()
    cy.get('#title').type('Test Meeting')
    cy.get('#name').type('Udoka Onyela')
    cy.get('button').contains('Schedule').click({ timeout: 10000 })

    cy.intercept('POST', '/api/secure/meetings').as('scheduleMeeting')

    cy.wait('@scheduleMeeting', { timeout: 60000 })
    cy.contains('Success!').should('exist')

    /* ==== End Cypress Studio ==== */
  })
})
