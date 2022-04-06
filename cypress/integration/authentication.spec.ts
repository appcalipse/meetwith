import { TestConstants } from '../constants';
import dotenv from 'dotenv';
dotenv.config();

describe('Basic Authentication With Metamask', () => {
  before(() => {
    cy.addMetamaskNetwork(TestConstants.network)

    cy.setupMetamask(TestConstants.network.secret, TestConstants.network.networkName, TestConstants.network.password);
    // cy.changeMetamaskNetwork(TestConstants.network.name)
    // cy.createMetamaskAccount('MWW1')
    // cy.switchMetamaskAccount('MWW1')
  });

  it('should navigate to the home section', () => {
    // given
    cy.visit(TestConstants.url)

    // when
    cy.get('#navbar-desktop a[href*="/#home"]').click()

    // then
    cy.url().should('include', '/#home')
    cy.get('main[data-testid="main-container"]').should('be.visible');
  })
})