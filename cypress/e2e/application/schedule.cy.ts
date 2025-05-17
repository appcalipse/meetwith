/// <reference types="cypress" />
const accountIdentifier = Cypress.env('TEST_ACCOUNT_IDENTIFIER')
const ownerAddress = '0xbae723e409ec9e0337dd7facfacd47b73aa3b620'

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
    cy.get('button').contains('MetaMask').click()
    cy.get('p').contains('Connecting')
    cy.confirmSignature()
    cy.url({ timeout: 150000 }).should('match', /dashboard/)
    // wait for re-direction completions before going to the next test
    cy.wait(10000)
  })
  afterEach(() => {
    cy.visit('/logout')
  })

  // https://on.cypress.io/interacting-with-elements
  it('Schedule - Public', () => {
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

    cy.wait('@scheduleMeeting', { timeout: 60000 }).then(
      (interception: any) => {
        expect(interception.response.statusCode).to.equal(200)
        const slotId = interception.response.body.id
        cy.log('slotId ID:', slotId)
        cy.log('Owner Address:', ownerAddress)

        // Check if the event exists in the calendar
        cy.wait(10000)
        cy.eventExists(ownerAddress, slotId).then(exists => {
          expect(exists).to.be.true
          cy.log('Event exists in the calendar')
        })
        cy.eventExists(accountIdentifier, slotId).then(exists => {
          expect(exists).to.be.true
          cy.log('Event exists in the calendar')
        })
      }
    )
    cy.contains('Success!').should('exist')

    /* ==== End Cypress Studio ==== */
  })
  it('Schedule - Group', () => {
    cy.visit('/dashboard/schedule')
  })
})
