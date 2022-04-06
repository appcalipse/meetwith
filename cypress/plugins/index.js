/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  //https://github.com/CraftAcademyLabs/cypress-metamask
  require('cypress-metamask/plugins')(on);

  // https://stackoverflow.com/questions/61863739/cypress-test-approach-for-testing-with-metamask
  // on('before:browser:launch', async (browser = {}, arguments_) => {
  //   if (browser.name === 'chrome') {
  //     arguments_.args.push('--disable-background-timer-throttling');
  //     arguments_.args.push('--disable-backgrounding-occluded-windows');
  //     arguments_.args.push('--disable-renderer-backgrounding');
  //   }
  // })
}
