describe('About page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('has the correct <h1>', () => {
    cy.contains('h1', 'Hey there!');
  });

  it('navigates to /open-source', () => {
    cy.get('nav a').contains('Open Source').click();
    cy.url().should('include', '/open-source');
    cy.contains('h1', 'Open source');
  });
});

describe('Open source page', () => {
  beforeEach(() => {
    cy.visit('/open-source');
  });

  it('has the correct <h1>', () => {
    cy.contains('h1', 'Open source');
  });

  it('navigates to repo details page', () => {
    cy.get('a h3').contains('ls-age/eslint-config').click();
    cy.url().should('include', '/open-source/ls-age/eslint-config');
  });
});

describe('Repo details page', () => {
  beforeEach(() => {
    cy.visit('/open-source/ls-age/eslint-config');
  });

  it('has the correct <h1>', () => {
    cy.contains('h1', 'ls-age/eslint-config');
  });

  it("displays the repo's description", () => {
    cy.contains('h2', "This package provides ls-age's ESLint configuration");
  });

  it("displays the repo's readme", () => {
    cy.contains('h1', '@ls-age/eslint-config');
    cy.contains('h3', 'API docs are linted');
  });
});
