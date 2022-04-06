declare global {
    namespace Cypress {
      interface Chainable {
        changeMetamaskNetwork(value: string): Chainable<Element>
        setupMetamask(): Chainable<Element>
      }
    }
  }