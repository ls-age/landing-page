const { defineConfig } = require('cypress')

module.exports = defineConfig({
  fixturesFolder: 'test/fixtures',
  screenshotsFolder: 'test/report/screenshots',
  videosFolder: 'test/report/videos',
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    setupNodeEvents(on, config) {},
    baseUrl: 'http://localhost:3003',
    specPattern: 'test/integration/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
  },
})
