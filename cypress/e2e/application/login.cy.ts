/// <reference types="cypress" />
const TEST_ACCOUNT_REGEX = /0x[a-fA-F0-9]/
context('Actions', () => {
  beforeEach(() => {
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
  })
  afterEach(() => {
    cy.visit('/logout')
  })

  // https://on.cypress.io/interacting-with-elements

  it('Login - With Metamask', () => {
    cy.get('button').contains('MetaMask').click()
    cy.get('p').contains('Connecting')
    cy.confirmSignature()
    cy.url({ timeout: 150000 }).should('match', /dashboard/)

    cy.contains(TEST_ACCOUNT_REGEX).should('exist')
  })
})
