describe('docs', () => {
  function visit(path: string, failOnStatusCode = true) {
    cy.visit(path, {
      failOnStatusCode,
      onBeforeLoad(window) {
        cy.stub(window.console, 'error').as('consoleError');
      },
    });
  }

  afterEach(() => {
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('renders the product shell with one main landmark and security headers', () => {
    visit('/');

    cy.title().should('contain', 'Chakra Docs');
    cy.get('main').should('have.length', 1);
    cy.get('h1').should('have.text', 'Chakra Docs');
    cy.get('nav[aria-label="Main navigation"]')
      .contains('a', 'Docs')
      .should('have.attr', 'href', '/docs');

    cy.request('/').then((response) => {
      expect(response.headers['x-content-type-options']).to.equal('nosniff');
      expect(response.headers['x-frame-options']).to.equal('DENY');
      expect(response.headers['referrer-policy']).to.equal(
        'strict-origin-when-cross-origin',
      );
      expect(response.headers['permissions-policy']).to.contain('camera=()');
      expect(response.headers['content-security-policy']).to.contain(
        "default-src 'self'",
      );
      expect(response.headers['content-security-policy']).to.contain(
        "frame-ancestors 'none'",
      );
      expect(response.headers['strict-transport-security']).to.equal(
        'max-age=31536000; includeSubDomains',
      );
      expect(response.headers['cross-origin-opener-policy']).to.equal(
        'same-origin',
      );
    });

    cy.request('/api/health').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ status: 'ok' });
      expect(response.headers['cache-control']).to.contain('no-store');
    });
  });

  it('renders docs without nested main landmarks and keeps TOC anchors valid', () => {
    visit('/docs');

    cy.get('main').should('have.length', 1);
    cy.get('h1').should('contain.text', 'Overview');
    cy.get('#what-this-example-includes').should('exist');
    cy.get('a[href="#what-this-example-includes"]').should('exist');
  });

  it('renders the Postkit integration page through Postkit prose and directives', () => {
    visit('/docs/postkit');

    cy.get('h1').should('contain.text', 'Render docs with Postkit');
    cy.get('[data-postkit-component="Prose"]').should('have.length', 1);
    cy.get('[data-postkit-component="Callout"]')
      .should('have.attr', 'data-postkit-tone', 'tip')
      .and('contain.text', 'This page is the example');
    cy.get('#share-the-chakra-system').should('exist');
    cy.get('a[href="#share-the-chakra-system"]').should('exist');
  });

  it('composes split page actions with independently nested menus', () => {
    visit('/docs/components');

    cy.get('summary[aria-label="More page action examples"]').as(
      'pageActionsMenu',
    );
    cy.get('@pageActionsMenu').click();
    cy.get('@pageActionsMenu').parent('details').should('have.attr', 'open');
    cy.contains('summary', 'Open in another chat').as('chatSubmenu');
    cy.get('@chatSubmenu').click();
    cy.get('@chatSubmenu').parent('details').should('have.attr', 'open');
    cy.contains('button', 'ChatGPT').click();
    cy.get('@pageActionsMenu')
      .parent('details')
      .should('not.have.attr', 'open');
  });

  it('supports pointer search navigation through the Next router', () => {
    visit('/');
    cy.intercept('GET', '**/api/docs/search?q=installation*').as(
      'installationSearch',
    );

    cy.contains('button', 'Search').click();
    cy.get('input[aria-label="Search"]')
      .should('be.visible')
      .and('be.focused')
      .type('installation');
    cy.wait('@installationSearch');
    cy.contains('a', 'Installation').first().click();

    cy.location('pathname').should('equal', '/docs/installation');
    cy.get('h1').should('contain.text', 'Installation');
  });

  it('supports the keyboard shortcut, result activation, and focus restoration', () => {
    visit('/docs');
    cy.intercept('GET', '**/api/docs/search?q=configuration*').as(
      'configurationSearch',
    );

    cy.get('body').type('{ctrl}k');
    cy.get('input[aria-label="Search"]')
      .should('be.focused')
      .type('configuration');
    cy.wait('@configurationSearch');
    cy.get('[role="dialog"]')
      .contains('a', 'Configuration')
      .should('be.visible');
    cy.get('input[aria-label="Search"]').type('{enter}');
    cy.location('pathname').should('equal', '/docs/configuration');

    cy.contains('button', 'Search').as('searchTrigger').click();
    cy.get('input[aria-label="Search"]').should('be.focused').type('{esc}');
    cy.get('@searchTrigger').should('be.focused');
  });

  it('serves compact, bounded search results from the API', () => {
    cy.wrap(cy.stub()).as('consoleError');

    cy.request({
      url: '/api/docs/search',
      qs: { q: 'installation', limit: 2 },
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.query).to.equal('installation');
      expect(response.body.results.length).to.be.within(1, 2);
      expect(response.body.results[0]).to.include({
        route: '/docs/installation',
        title: 'Installation',
      });
      expect(response.body.results[0]).not.to.have.property('text');
      expect(response.body.results[0]).not.to.have.property('headings');
      expect(response.headers['cache-control']).to.contain('s-maxage=300');
    });

    cy.request({
      failOnStatusCode: false,
      url: '/api/docs/search',
      qs: { q: 'installation', limit: 21 },
    }).then((response) => {
      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('invalid_request');
    });
  });

  it('uses the configured Next link component for docs navigation', () => {
    visit('/docs/installation');

    cy.contains('a[href="/docs/configuration"]', 'Configuration')
      .last()
      .click();

    cy.location('pathname').should('equal', '/docs/configuration');
    cy.get('h1').should('contain.text', 'Configuration');
  });

  it('renders a useful not-found response', () => {
    visit('/this-page-does-not-exist', false);

    cy.get('main').should('have.length', 1);
    cy.get('h1').should('have.text', 'Page not found');
    cy.get('meta[name="robots"]').should('have.attr', 'content', 'noindex');
    cy.contains('a', 'Return home').should('have.attr', 'href', '/');
  });
});
