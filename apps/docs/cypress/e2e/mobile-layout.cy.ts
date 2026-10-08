describe('documentation controls layout', () => {
  function assertFullscreenMenu(width: number, height: number) {
    cy.get('[role="dialog"]').should(($dialog) => {
      const bounds = $dialog[0].getBoundingClientRect();
      expect(Math.abs(bounds.left)).to.be.at.most(1);
      expect(Math.abs(bounds.top)).to.be.at.most(1);
      expect(Math.abs(bounds.width - width)).to.be.at.most(1);
      expect(Math.abs(bounds.height - height)).to.be.at.most(1);
    });
    cy.get('[role="dialog"] button[aria-label="Close navigation"]')
      .should('be.visible')
      .and('have.css', 'width', '44px')
      .and('have.css', 'height', '44px');
    cy.get('[role="dialog"] .chakra-dialog__body').should(
      'have.css',
      'overflow-y',
      'auto',
    );
    cy.get('[role="dialog"] .chakra-dialog__header').should(($header) => {
      const header = $header[0];
      const title = header.querySelector('.chakra-dialog__title');
      const close = header.querySelector(
        'button[aria-label="Close navigation"]',
      );
      if (!title || !close) throw new Error('Expected both header controls');
      const headerBounds = header.getBoundingClientRect();
      const headerCenter = headerBounds.top + headerBounds.height / 2;
      for (const control of [title, close]) {
        const bounds = control.getBoundingClientRect();
        expect(
          Math.abs(bounds.top + bounds.height / 2 - headerCenter),
        ).to.be.at.most(1);
      }
    });
    cy.get('[role="dialog"] button[data-part="trigger"]').should(($trigger) => {
      const trigger = $trigger[0];
      const row = trigger.parentElement;
      if (!row) throw new Error('Expected a search row');
      const availableWidth =
        row.clientWidth -
        parseFloat(Cypress.$(row).css('padding-left')) -
        parseFloat(Cypress.$(row).css('padding-right'));
      expect(
        Math.abs(trigger.getBoundingClientRect().width - availableWidth),
      ).to.be.at.most(1);
    });
  }

  for (const route of ['/', '/docs/installation']) {
    for (const width of [320, 375, 768]) {
      it(`keeps Menu beside On this page on ${route} at ${width}px`, () => {
        cy.viewport(width, 812);
        cy.visit(route);
        cy.get('[aria-label="Documentation controls"]').as('controls');
        cy.get('@controls').should('be.visible');
        cy.get('@controls')
          .find('button[aria-label="Open navigation"]')
          .should('be.visible')
          .and('have.css', 'min-height', '44px');
        cy.get('@controls').find('summary').should('be.visible');
        cy.get('@controls').should(($controls) => {
          const menu = $controls[0].querySelector('button');
          const toc = $controls[0].querySelector('summary');
          if (!menu || !toc) throw new Error('Expected both mobile controls');
          const menuBounds = menu.getBoundingClientRect();
          const tocBounds = toc.getBoundingClientRect();
          expect(menuBounds.right).to.be.lessThan(tocBounds.left);
          expect(Math.abs(menuBounds.top - tocBounds.top)).to.be.at.most(1);
          expect(tocBounds.right).to.be.at.most(width - 16);
        });
        cy.get('html').should(($html) => {
          expect($html[0].scrollWidth).to.be.at.most(width + 1);
        });
        cy.get('@controls').find('summary').click();
        cy.get('@controls').find('details').should('have.attr', 'open');
        cy.get('@controls')
          .find('details a')
          .first()
          .should('be.visible')
          .click();
        cy.location('hash').should('not.be.empty');
        cy.get('@controls').find('summary').click();
        cy.scrollTo('top');
        if (width === 375)
          cy.screenshot(`${route === '/' ? 'home' : 'docs'}-mobile-controls`, {
            capture: 'viewport',
          });
        cy.get('@controls')
          .find('button[aria-label="Open navigation"]')
          .click();
        cy.get('[role="dialog"]').should('be.visible');
        assertFullscreenMenu(width, 812);
        cy.get('[role="dialog"]')
          .contains('a[href="/docs/configuration"]', 'Configuration')
          .click();
        cy.location('pathname').should('equal', '/docs/configuration');
        cy.get('[role="dialog"]').should('not.be.visible');
      });
    }
  }

  it('shows a compact menu without an empty TOC on the showcase', () => {
    cy.viewport(375, 812);
    cy.visit('/showcase');
    cy.get('[aria-label="Documentation controls"]').should('be.visible');
    cy.get('button[aria-label="Open navigation"]').should('be.visible');
    cy.get('[aria-label="Documentation controls"] summary').should('not.exist');
    cy.get('button[aria-label="Open navigation"]').click();
    assertFullscreenMenu(375, 812);
    cy.get('button[aria-label="Close navigation"]').click();
    cy.get('[role="dialog"]').should('not.be.visible');
    cy.get('button[aria-label="Open navigation"]').should('be.focused');
    cy.viewport(1024, 900);
    cy.get('[aria-label="Documentation controls"]').should('not.be.visible');
  });

  it('retains the tablet TOC and full desktop navigation', () => {
    cy.viewport(1024, 900);
    cy.visit('/docs/installation');
    cy.get('[aria-label="Documentation controls"]').should('be.visible');
    cy.get('button[aria-label="Open navigation"]').should('not.be.visible');
    cy.get('[aria-label="Documentation controls"] summary').should(
      'be.visible',
    );
    cy.viewport(1440, 900);
    cy.get('[aria-label="Documentation controls"]').should('not.be.visible');
    cy.contains('nav a[href="/docs/configuration"]', 'Configuration')
      .filter(':visible')
      .should('have.length.greaterThan', 0);
  });
});
