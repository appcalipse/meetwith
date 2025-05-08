/// <reference types="cypress" />
const accountIdentifier = Cypress.env('TEST_ACCOUNT_IDENTIFIER')
context('Actions', () => {
  before(() => {
    cy.setCookie(
      'mww_iron',
      'Fe26.2*1*0f1844d8daa1516cce03d78eeb5381e78124681ed87976da5224b6d56a8b8457*rasdqD6UpTt1_xc10X_Onw*FfPVX4q_yzfU7dTO1wYnjdXkxwzcs4BHXLDA2FbZWuqc45GS3Q6l3qGA6McDdQ6WZ5nTwtpizW8ki41dAKQ_rzJ_S4HAradnNAJYS2vQnbcNzg77R-5WXTrqsi0ibK7xOSO27Ux27qiPRLxCwpcW8cA3tLBeCpEPu2KRlFVAUFPp3HSn1-7q5GjZIm2OsetznxFQSiSsyGyvKwaFsMxDWUJ1SSSZJWg4FbySPw60GbQUkrj8kn98QCHlEzgHGOW2YPDscsC7a_aO3sKmuOZ2tBACdmko1RucrYIYoj2ohETqda3EvgG5PcrUYnRDYaYda7PeZohlnbYIwOq7g8pG8YCZa72UssqgAaeBMDBQYnSSHLyZM9JXvnQnWi5_77vSV-WlIKj_HaWFgYlETp2YBR3O5BfAfL9r4h-FRHoYg8-iKe6r9QTibwLPP1FUalJ3E1dcthm2jS2bl19XwfCbbe-BuW0cWOWVb3Hcs0a1zAcsI-f8TMcGGA2OBbpPMhJW9tis3Jtm7qbO169S5nNk-5uc4q6W2jBK9iN-JbO6RQAO4U1Zfb-6llPzUc0FLC9suMo4IZmJtInyhju2u3Kj6cxJkuDsEt_ICoKxFI6ssjov5t2bHXt7-ecpH736T4Uj03NSP8MBy2iWJmJcmbAq06wMVLNZ8LyrvV4LCqtmdfIjaF9wJhOQ2gIefiEh6GIKNIAwIbi_wPgg6JVKvzqyV322LtbJ_EriYk9xX3qT1VjS6k6eP5zg6TlT1nQ_cUvrc0OcfWLz6bp3BBZYX1GBYcnHUM2ivYxLlfSI0X1CDxWwyjLelIzTyVj-Q5NJStTNpZJMt485bokByfV62ovt701NQJnEEnrJTGTwhESfY-zVaKvKngD1T_hIP4E4QGNQAIASTZDpE4sDir52lqX9JcvEFBY9XwaOWMdH0yF5lq5BuThBPoJpKKD1xARvDIeDNwFar4ocVwV1842fAalFSZ0EkwivESPIMDgk2y19ux03bLhf_-0ufY3YyUEiK1NZkfDQfDCUW10FvGWMa4Hjyg*1778179707906*9f47499791e3e0dcff90da985e8c88e184d823e46472f588347a93c736cdb3de*CZjfjCnVPx24nyK7Aj09zaTpL04ba0QpbL12nxQd-NY~2',
      {
        domain: 'localhost',
        path: '/',
        sameSite: 'lax',
      }
    )
    cy.window().then(win => {
      win.localStorage.setItem(
        'current_user_sig:0xba90c89469462bf45427c06eba01dc0cea559557',
        '0x5f4e1610adfc3304dbe0f68c2012884dcc7f4aa12e3615c868c0a4350083ba4127ca37b0491305dc0ba5db901947f125dad2db6202b7bb41ea8fbff79ea41a7c1b'
      )
      win.localStorage.setItem('thirdweb:active-wallet-id', 'io.metamask')
      win.localStorage.setItem(
        'thirdweb:connected-wallet-ids',
        JSON.stringify(['io.metamask'])
      )
    })
    cy.visit('/')
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
    })
  })
  afterEach(() => {
    // cy.visit('/logout')
  })

  // https://on.cypress.io/interacting-with-elements
  it('Schedule - Guests no availability', () => {
    cy.visit('/test')
    cy.intercept('GET', `/meetings/busy/${accountIdentifier}*`).as('busySlots')
    cy.wait(5000)
    /* ==== Generated with Cypress Studio ==== */
    cy.get('[data-testid="invalid-day"]').first().should('exist')
    cy.get('[data-testid="valid-day"]').first().click()
    cy.get('[data-testid="availability"]').first().click()
    cy.get('#title').type('Test Meeting')
    cy.get('#name').type('Udoka Onyela')
    cy.get('button').contains('Schedule').click()
    cy.wait(5000)

    cy.contains('Success!').should('exist')

    /* ==== End Cypress Studio ==== */
  })
})
