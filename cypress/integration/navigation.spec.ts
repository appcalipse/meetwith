import { TestConstants } from '../constants';

describe('Basic Navigation', () => {
  it('should navigate to the home section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('#navbar-desktop a[href*="/#home"]').click()

    // then
    cy.url().should('include', '/#home')
    cy.get('main[data-testid="main-container"]').should('be.visible');
  })

  it('should navigate to the Pricing section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('#navbar-desktop a[href*="/#pricing"]').click()

    // then
    cy.url().should('include', '/#pricing')
    cy.get('main[data-testid="main-container"]').should('be.visible');
  })

  it('should navigate to the FAQ section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('#navbar-desktop a[href*="/#faq"]').click()

    // then
    cy.url().should('include', '/#faq')
    cy.get('main[data-testid="main-container"]').should('be.visible');
  })

  it('should navigate to the Terms section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('a[href*="/legal/terms"]').click()

    // then
    cy.url().should('include', '/legal/terms')
  })

  it('should navigate to the Privacy section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('a[href*="/legal/privacy"]').click()

    // then
    cy.url().should('include', '/legal/privacy')
  })

  it('should navigate to the dpa section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('a[href*="/legal/dpa"]').click()

    // then
    cy.url().should('include', '/legal/dpa')
  })
})