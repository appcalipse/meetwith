/// <reference types="cypress" />
const TEST_ACCOUNT_REGEX = /0x[a-fA-F0-9]/
context('Actions', () => {
  before(() => {
    cy.once('window:load', () => {
      cy.get('button[aria-controls="ReactQueryDevtoolsPanel"]').click({
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
  })
  beforeEach(() => {
    cy.visit('/')
  })
  afterEach(() => {
    cy.visit('/logout')
  })

  // https://on.cypress.io/interacting-with-elements

  it('Login - WIth Metamask', () => {
    cy.get('button').contains('MetaMask').click()

    cy.wait(10000)
    cy.url({ timeout: 15000 }).should('match', /dashboard/)

    cy.contains(TEST_ACCOUNT_REGEX).should('exist')
  })
})
