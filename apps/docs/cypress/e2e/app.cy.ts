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

  it('serves canonical social metadata, crawl endpoints, and a real PNG card', () => {
    for (const path of ['/', '/docs/installation', '/showcase', '/withoss']) {
      visit(`${path}?utm_source=test#ignored`);
      cy.get('link[rel="canonical"]').should(
        'have.attr',
        'href',
        `https://chakra-docs.dev${path}`,
      );
      cy.get('meta[property="og:url"]').should(
        'have.attr',
        'content',
        `https://chakra-docs.dev${path}`,
      );
      cy.get('meta[property="og:title"]')
        .invoke('attr', 'content')
        .should('not.be.empty');
      cy.get('meta[name="twitter:card"]').should(
        'have.attr',
        'content',
        'summary_large_image',
      );
      cy.get('meta[property="og:image"]').should(
        'have.attr',
        'content',
        'https://chakra-docs.dev/api/social-image',
      );
      cy.get('@consoleError').should('not.have.been.called');
    }
    cy.request('/sitemap.xml').then(({ headers, body }) => {
      expect(headers['content-type']).to.contain('application/xml');
      const xml = Cypress.$.parseXML(body);
      if (!xml) throw new Error('Expected a valid XML sitemap');
      const urls = [...xml.querySelectorAll('loc')].map(
        (node) => node.textContent,
      );
      expect(urls).to.include.members([
        'https://chakra-docs.dev/',
        'https://chakra-docs.dev/docs',
        'https://chakra-docs.dev/docs/installation',
        'https://chakra-docs.dev/showcase',
        'https://chakra-docs.dev/withoss',
      ]);
      expect(urls).to.have.length(12);
      expect(
        urls.some((url) => /og-image|\/api\/|\/404/.test(url ?? '')),
      ).to.equal(false);
    });
    cy.request('/robots.txt').then(({ headers, body }) => {
      expect(headers['content-type']).to.contain('text/plain');
      expect(body).to.contain('Sitemap: https://chakra-docs.dev/sitemap.xml');
      expect(body).to.contain('Allow: /api/social-image');
    });
    cy.request({ url: '/api/social-image', encoding: 'binary' }).then(
      ({ headers, body }) => {
        expect(headers['content-type']).to.contain('image/png');
        expect(headers['cache-control']).to.contain('s-maxage=86400');
        expect(
          [...body.slice(0, 8)].map((character) => character.charCodeAt(0)),
        ).to.deep.equal([137, 80, 78, 71, 13, 10, 26, 10]);
        const bytes = Uint8Array.from(body, (character: string) =>
          character.charCodeAt(0),
        );
        const view = new DataView(bytes.buffer);
        expect(view.getUint32(16)).to.equal(1200);
        expect(view.getUint32(20)).to.equal(630);
        cy.writeFile('test-output/social-card.png', body, 'binary');
      },
    );
  });

  it('lazily highlights Chakra Docs and Postkit code with the first-party adapter', () => {
    for (const route of ['/docs/components', '/docs/postkit']) {
      visit(route);
      cy.get('pre code .line[data-line="1"] span[style*="color:"]').should(
        'have.length.greaterThan',
        0,
      );
      cy.get('pre pre, code code').should('not.exist');
      cy.get('@consoleError').should('not.have.been.called');
    }
  });

  function registerResponsiveTableTests() {
    for (const width of [320, 375, 768, 1440]) {
      it(`contains wide API, Markdown and Postkit tables at ${width}px without page overflow`, () => {
        cy.viewport(width, 900);
        for (const { route, table, scroller, label } of [
          {
            route: '/docs/components',
            table:
              '[role="region"][aria-label="Responsive API table example"] table',
            scroller:
              '[role="region"][aria-label="Responsive API table example"]',
            label: 'Responsive API table example',
          },
          {
            route: '/docs/components',
            table: '[role="region"][aria-label="Markdown table"] table',
            scroller: '[role="region"][aria-label="Markdown table"]',
            label: 'Markdown table',
          },
          {
            route: '/docs/postkit',
            table: '[data-postkit-prose-element="table"]',
            scroller: '[data-postkit-prose-element="table"]',
            label: undefined,
          },
        ]) {
          visit(route);
          // Wait for interactive hydration before mutating a server-rendered cell.
          cy.contains('button', 'Search').click();
          cy.get('[role="dialog"]').should('be.visible');
          cy.get('[role="combobox"]').type('{esc}');
          cy.get('[role="dialog"]').should('not.be.visible');
          // Stress intrinsic sizing with an unbreakable identifier, regardless
          // of which example content happens to be documented on the page.
          cy.get(table)
            .find('td')
            .first()
            .invoke('text', 'LongIdentifier'.repeat(30));
          cy.get('html').should(($element) => {
            expect($element[0].scrollWidth).to.be.at.most(
              $element[0].clientWidth + 1,
            );
          });
          cy.get('body').should(($element) => {
            expect($element[0].scrollWidth).to.be.at.most(width + 1);
          });
          cy.get(scroller)
            .should(($element) => {
              const element = $element[0];
              expect(element.scrollWidth).to.be.greaterThan(
                element.clientWidth,
              );
              expect(element.getBoundingClientRect().right).to.be.at.most(
                width,
              );
            })
            .scrollTo('right');
          cy.get(scroller).should(($element) => {
            expect($element[0].scrollLeft).to.be.greaterThan(0);
          });
          if (label) {
            cy.get(scroller)
              .should('have.attr', 'role', 'region')
              .and('have.attr', 'aria-label', label)
              .focus();
            cy.get(scroller).should('be.focused');
            cy.get(table).should('have.css', 'display', 'table');
          }
          cy.get('@consoleError').should('not.have.been.called');
        }
      });
    }
  }

  it('renders the product shell with one main landmark and security headers', () => {
    visit('/');

    cy.title().should('contain', 'Chakra Docs');
    cy.get('main').should('have.length', 1);
    cy.get('h1').should('have.text', 'Chakra Docs');
    cy.get('header a[aria-label="View chakra-docs on GitHub"]').should(
      'have.attr',
      'href',
      'https://github.com/chakra-docs/chakra-docs',
    );
    cy.get('main a[href="/docs/installation"]').should(
      'have.length.greaterThan',
      0,
    );
    cy.get('footer a[href="/withoss"]').should('exist');
    cy.get('[aria-label="By Commune Software"] a').should(
      'have.attr',
      'href',
      'https://commune.software',
    );

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

    cy.get('button[aria-label="More page action examples"]').as(
      'pageActionsMenu',
    );
    cy.get('button[aria-label="Copy page"]').first().as('primaryAction');
    cy.get('@primaryAction')
      .should('have.css', 'background-color', 'rgba(0, 0, 0, 0)')
      .and('have.css', 'min-height', '44px')
      .and('have.css', 'padding-left', '16px')
      .and('have.css', 'padding-right', '16px')
      .and('have.css', 'border-right-width', '0px')
      .and('have.css', 'border-top-right-radius', '0px');
    cy.get('@pageActionsMenu')
      .should('have.css', 'background-color', 'rgba(0, 0, 0, 0)')
      .and('have.css', 'min-width', '44px')
      .and('have.css', 'padding-left', '12px')
      .and('have.css', 'padding-right', '12px')
      .and('have.css', 'border-left-width', '1px')
      .and('have.css', 'border-top-left-radius', '0px');
    cy.get('@primaryAction').then(($primary) => {
      cy.get('@pageActionsMenu').should(($menu) => {
        const primary = $primary[0].getBoundingClientRect();
        const menu = $menu[0].getBoundingClientRect();
        expect(primary.height).to.equal(menu.height);
        expect(primary.right).to.be.closeTo(menu.left, 0.5);
      });
    });
    cy.get('@pageActionsMenu').click();
    cy.get('@pageActionsMenu').should('have.attr', 'aria-expanded', 'true');
    cy.get('[role="menu"]')
      .filter(':visible')
      .should(($menu) =>
        expect($menu[0].getBoundingClientRect().width).to.be.at.least(288),
      )
      .and('have.css', 'padding', '8px')
      .and('have.css', 'border-radius', '12px');
    cy.get('[role="menuitem"]')
      .filter(':visible')
      .first()
      .should('have.css', 'padding', '12px')
      .and('have.css', 'font-size', '14px');
    for (const description of [
      'Copy page as Markdown for LLMs',
      'Copy a link to this page',
    ]) {
      cy.get('[role="menuitem"] span')
        .filter((_, element) => Cypress.$(element).text() === description)
        .should('have.length', 1)
        .should(($description) => {
          const stack = $description.parent();
          expect(stack.css('display')).to.equal('flex');
          expect(stack.css('flex-direction')).to.equal('column');
          const label = stack.children().first();
          const labelOffset = label.offset();
          const detailsOffset = $description.offset();
          const labelHeight = label.outerHeight();
          if (!labelOffset || !detailsOffset || labelHeight === undefined) {
            throw new Error('Page-action text must have measurable bounds');
          }
          expect(detailsOffset.top).to.be.at.least(
            labelOffset.top + labelHeight,
          );
          expect(detailsOffset.left).to.be.closeTo(labelOffset.left, 0.5);
        });
    }
    cy.contains('[role="menuitem"]', 'Open in another chat').as('chatSubmenu');
    cy.get('@chatSubmenu').click();
    cy.get('@chatSubmenu').should('have.attr', 'aria-expanded', 'true');
    cy.contains('[role="menuitem"]', 'ChatGPT').should(
      'have.css',
      'font-size',
      '14px',
    );
    cy.contains('[role="menuitem"]', 'ChatGPT').click();
    cy.get('@pageActionsMenu').should('have.attr', 'aria-expanded', 'false');

    cy.get('@pageActionsMenu').click();
    cy.get('[role="menu"]').should('be.visible').type('{esc}');
    cy.get('@pageActionsMenu')
      .should('have.attr', 'aria-expanded', 'false')
      .and('be.focused');
    cy.get('[role="menu"]:visible').should('not.exist');

    cy.get('@pageActionsMenu').click();
    cy.get('h1').click();
    cy.get('@pageActionsMenu').should('have.attr', 'aria-expanded', 'false');
    cy.get('[role="menu"]:visible').should('not.exist');
  });

  it('keeps page actions scrollable and readable in a small viewport', () => {
    cy.viewport(280, 360);
    visit('/docs/components');
    cy.get('button[aria-label="More page action examples"]').click();
    cy.get('[role="menu"]').filter(':visible').as('boundedMenu');
    cy.get('@boundedMenu')
      .find('span')
      .filter(
        (_, element) =>
          Cypress.$(element).text() === 'Copy page as Markdown for LLMs',
      )
      .invoke('text', 'AnUnbrokenDescription'.repeat(20));
    cy.get('@boundedMenu').should(($menu) => {
      const menu = $menu[0];
      const bounds = menu.getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(280);
      expect(bounds.top).to.be.at.least(0);
      expect(bounds.bottom).to.be.at.most(360);
      expect(menu.scrollWidth).to.be.at.most(menu.clientWidth + 1);
      expect(menu.scrollHeight).to.be.greaterThan(menu.clientHeight);
      const hit = menu.ownerDocument.elementFromPoint(
        bounds.left + 16,
        bounds.top + 16,
      );
      expect(
        hit && menu.contains(hit),
        'menu is above the sticky site header',
      ).to.equal(true);
    });
    cy.get('@boundedMenu').type('{end}');
    cy.get('@boundedMenu').should(($menu) => {
      const menu = $menu[0];
      const active = menu.querySelector('[data-highlighted]');
      if (!active) throw new Error('Expected a highlighted menu item');
      const bounds = active.getBoundingClientRect();
      const menuBounds = menu.getBoundingClientRect();
      expect(bounds.top).to.be.at.least(menuBounds.top);
      expect(bounds.bottom).to.be.at.most(menuBounds.bottom);
    });
    cy.get('@boundedMenu').type('{esc}');
    cy.get('button[aria-label="More page action examples"]').should(
      'be.focused',
    );
  });

  it('opens, clears, and reopens curated recommendations without empty API searches', () => {
    cy.intercept({ method: 'GET', pathname: '/api/docs/search' }).as(
      'searchRequests',
    );
    visit('/docs');
    cy.contains('button', 'Search').focus();
    cy.get('[role="dialog"]').should('not.exist');
    cy.contains('button', 'Search').type('{ctrl}k');
    cy.get('[role="combobox"]').should('be.focused');
    const recommendations = [
      'Installation',
      'Configuration',
      'Components',
      'Pages Router',
      'Search',
      'Machine-readable docs',
    ];
    cy.get('[role="option"]')
      .should('have.length', 6)
      .each(($option, index) => {
        expect($option.text()).to.contain(recommendations[index]);
      });
    cy.get('[role="combobox"]').type('{downarrow}');
    cy.get('[role="option"][aria-selected="true"]').should(
      'contain.text',
      'Configuration',
    );
    cy.intercept('GET', '**/api/docs/search?q=installation*').as('typedSearch');
    cy.get('[role="combobox"]').type('installation');
    cy.wait('@typedSearch');
    cy.get('button[aria-label="Clear search"]').click();
    cy.get('[role="combobox"]').should('have.value', '');
    cy.get('[role="option"]').should('have.length', 6);
    cy.get('[role="combobox"]').type('{esc}');
    cy.contains('button', 'Search').should('be.focused').type('{ctrl}k');
    cy.get('[role="option"]').should('have.length', 6);
    cy.get('@searchRequests.all').should((requests) => {
      const emptyRequests = (
        requests as unknown as Array<{ request: { url: string } }>
      ).filter(
        ({ request }) => !new URL(request.url).searchParams.get('q')?.trim(),
      );
      expect(emptyRequests, 'empty-query API searches').to.have.length(0);
    });
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
    cy.get('[role="dialog"]').contains('a', 'Installation').first().click();

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

  it('scrolls the active search result within a short viewport using only the keyboard', () => {
    cy.viewport(800, 480);
    cy.intercept('GET', '**/api/docs/search?q=keyboard-scroll-fixture*', {
      body: {
        query: 'keyboard-scroll-fixture',
        results: Array.from({ length: 12 }, (_, index) => ({
          id: `keyboard-${index}`,
          title: `Keyboard result ${index}`,
          description: 'A result with enough content to exercise scrolling.',
          route: '/docs/installation',
        })),
      },
    }).as('keyboardSearch');
    visit('/docs');
    cy.contains('button', 'Search').focus();
    cy.contains('button', 'Search').type('{ctrl}k');
    cy.get('[role="combobox"]')
      .should('be.focused')
      .type('keyboard-scroll-fixture');
    cy.wait('@keyboardSearch');
    cy.get('[role="option"]').should('have.length', 12);
    cy.get('[role="combobox"]').as('searchInput').should('be.focused');

    function activeRowIsVisible() {
      cy.get('@searchInput')
        .should(($input) => {
          const input = $input[0];
          const option = input.ownerDocument.getElementById(
            input.getAttribute('aria-activedescendant') ?? '',
          );
          expect(option?.getAttribute('aria-selected')).to.equal('true');
          const row = option?.parentElement;
          const scroller = row?.parentElement?.parentElement;
          if (!row || !scroller) throw new Error('Missing active result row');
          const bounds = row.getBoundingClientRect();
          const viewport = scroller.getBoundingClientRect();
          expect(bounds.top).to.be.at.least(viewport.top);
          expect(bounds.bottom).to.be.at.most(viewport.bottom);
        })
        .and('be.focused');
    }

    for (let index = 1; index < 12; index++) {
      cy.get('@searchInput').type('{downarrow}', { scrollBehavior: false });
      activeRowIsVisible();
    }
    cy.get('[role="listbox"]')
      .parent()
      .should(($pane) => {
        expect($pane.scrollTop()).to.be.greaterThan(0);
      });
    for (let index = 10; index >= 0; index--) {
      cy.get('@searchInput').type('{uparrow}', { scrollBehavior: false });
      activeRowIsVisible();
    }
    cy.get('[role="dialog"]').should(($dialog) => {
      expect($dialog[0].getBoundingClientRect().bottom).to.be.at.most(480);
    });
    cy.get('@searchInput').type('{esc}');
    cy.contains('button', 'Search').should('be.focused');
  });

  it('uses the configured Next link component for docs navigation', () => {
    cy.viewport(1280, 720);
    visit('/docs/installation');

    cy.contains('a[href="/docs/configuration"]', 'Configuration')
      .filter(':visible')
      .last()
      .click();

    cy.location('pathname').should('equal', '/docs/configuration');
    cy.get('h1').should('contain.text', 'Configuration');
  });

  it('opens, navigates, and dismisses the mobile documentation drawer', () => {
    cy.viewport(375, 667);
    visit('/docs/installation');

    cy.get('button[aria-label="Open navigation"]')
      .should('be.visible')
      .and('contain.text', 'Menu')
      .and('have.css', 'min-height', '44px')
      .click();

    cy.get('[role="dialog"]')
      .should('be.visible')
      .and('contain.text', 'Browse');
    cy.get('button[aria-label="Close navigation"]')
      .should('be.visible')
      .and('have.css', 'width', '44px')
      .and('have.css', 'height', '44px');
    cy.get('[role="dialog"]')
      .contains('a[href="/docs/configuration"]', 'Configuration')
      .click();

    cy.location('pathname').should('equal', '/docs/configuration');
    cy.get('[role="dialog"]').should('not.be.visible');
    cy.get('h1').should('contain.text', 'Configuration');
  });

  it('renders a useful not-found response', () => {
    visit('/this-page-does-not-exist', false);

    cy.get('main').should('have.length', 1);
    cy.get('h1').should('have.text', 'Page not found');
    cy.get('meta[name="robots"]').should('have.attr', 'content', 'noindex');
    cy.contains('a', 'Return home').should('have.attr', 'href', '/');
  });
  it('keeps the shared font stylesheet and compact site header across Next navigation', () => {
    cy.viewport(375, 812);
    visit('/');
    cy.get('header').should('have.css', 'height', '69px');
    cy.get(
      'link[rel="stylesheet"][href="https://kits.fontstack.com/kit/o0v0t0oi.css"]',
    ).should('have.length', 1);
    cy.window().then((window) => {
      (
        window as Window & { docsNavigationMarker?: string }
      ).docsNavigationMarker = 'preserved';
    });
    cy.contains('a', 'Read the getting-started guide').click();
    cy.location('pathname').should('equal', '/docs/installation');
    cy.window().its('docsNavigationMarker').should('equal', 'preserved');
    cy.get(
      'link[rel="stylesheet"][href="https://kits.fontstack.com/kit/o0v0t0oi.css"]',
    ).should('have.length', 1);
    cy.get('header').should('have.css', 'height', '69px');
  });
  it('renders the OSS acknowledgements with the shared artwork and no page overflow', () => {
    cy.viewport(375, 812);
    visit('/withoss');
    cy.get('main').should('have.length', 1);
    cy.get('h1').should(
      'have.attr',
      'aria-label',
      'Made with open-source software',
    );
    cy.get('main img[src="/assets/oss.svg"]').should('be.visible');
    cy.get('section[aria-labelledby="oss-library"]')
      .find('a[href="https://chakra-ui.com/"]')
      .should('be.visible');
    cy.get('section[aria-labelledby="oss-site"]')
      .find('a[href="https://chakra-ui.com/"]')
      .should('exist');
    cy.get('html').should((element) =>
      expect(element[0].scrollWidth).to.be.at.most(element[0].clientWidth + 1),
    );
  });
  // These open search to await hydration.
  registerResponsiveTableTests();
});
