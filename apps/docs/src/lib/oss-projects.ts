/** Selected credits, not an exhaustive transitive dependency or license inventory. */
export const ossProjectGroups = [
  {
    id: 'library',
    title: 'Library and packages',
    description:
      'Selected dependencies and framework peers used by the published library and its optional packages. Optional integrations are labeled below.',
    projects: [
      {
        name: 'React',
        packages: ['react'],
        description: 'Components and rendering for the library APIs.',
        href: 'https://react.dev/',
      },
      {
        name: 'Chakra UI',
        packages: ['@chakra-ui/react'],
        description: 'Accessible components, tokens, and recipe-based styling.',
        href: 'https://chakra-ui.com/',
      },
      {
        name: 'Emotion',
        packages: ['@emotion/react'],
        description: 'The styling runtime behind Chakra UI.',
        href: 'https://emotion.sh/',
      },
      {
        name: 'Next.js',
        packages: ['next'],
        description:
          'Framework integration through the optional Next.js adapter.',
        href: 'https://nextjs.org/',
      },
      {
        name: 'react-markdown',
        packages: ['react-markdown'],
        description: 'Safe Markdown rendering without executable MDX.',
        href: 'https://github.com/remarkjs/react-markdown',
      },
      {
        name: 'remark / unified',
        packages: ['remark-gfm'],
        description:
          'GitHub-flavored Markdown parsing and document processing.',
        href: 'https://unifiedjs.com/',
      },
      {
        name: 'Shiki',
        packages: ['shiki'],
        description: 'Syntax highlighting through the optional Shiki adapter.',
        href: 'https://shiki.style/',
      },
      {
        name: 'MiniSearch',
        packages: ['minisearch'],
        description: 'Full-text search, fuzzy matching, and result ranking.',
        href: 'https://github.com/lucaong/minisearch',
      },
      {
        name: 'js-yaml',
        packages: ['js-yaml'],
        description:
          'Parsing documentation frontmatter in the filesystem source.',
        href: 'https://github.com/nodeca/js-yaml',
      },
      {
        name: 'tinyglobby',
        packages: ['tinyglobby'],
        description:
          'Discovering documentation files in the filesystem source.',
        href: 'https://github.com/SuperchupuDev/tinyglobby',
      },
      {
        name: 'Pagefind',
        packages: ['pagefind'],
        description:
          'Optional static search integration through the Pagefind adapter.',
        href: 'https://pagefind.app/',
      },
      {
        name: 'Astro',
        packages: ['astro'],
        description:
          'Optional framework integration through the Astro adapter.',
        href: 'https://astro.build/',
      },
      {
        name: 'React Router',
        packages: ['react-router'],
        description:
          'Optional framework integration through the React Router adapter.',
        href: 'https://reactrouter.com/',
      },
    ],
  },
  {
    id: 'site',
    title: 'Documentation site',
    description:
      'Projects used to build and run this website. Shared dependencies appear in both sections when they serve both.',
    projects: [
      {
        name: 'React',
        packages: ['react', 'react-dom'],
        description: 'The component and rendering foundation for this site.',
        href: 'https://react.dev/',
      },
      {
        name: 'Next.js',
        packages: ['next'],
        description: 'Routing, static generation, and site builds.',
        href: 'https://nextjs.org/',
      },
      {
        name: 'Chakra UI',
        packages: ['@chakra-ui/react'],
        description:
          "Accessible interface components and the site's theme system.",
        href: 'https://chakra-ui.com/',
      },
      {
        name: 'Emotion',
        packages: ['@emotion/react'],
        description: 'The styling runtime behind Chakra UI.',
        href: 'https://emotion.sh/',
      },
      {
        name: 'Chakra Docs',
        packages: ['@chakra-docs/chakra', '@chakra-docs/core'],
        description:
          'Documentation navigation, search, page actions, and code examples.',
        href: 'https://github.com/chakra-docs/chakra-docs',
      },
      {
        name: 'Postkit',
        packages: ['@postkit/react'],
        description: 'Markdown prose and document components for the guides.',
        href: 'https://github.com/postkit-org/postkit-js',
      },
      {
        name: 'next-themes',
        packages: ['next-themes'],
        description: 'System-aware light and dark color modes.',
        href: 'https://github.com/pacocoursey/next-themes',
      },
      {
        name: 'react-fathom',
        packages: ['react-fathom', 'fathom-client'],
        description:
          'Privacy-focused pageviews and documentation interaction events.',
        href: 'https://react-fathom.dev/',
      },
      {
        name: 'React Icons',
        packages: ['react-icons'],
        description: 'Consistent SVG icons across the interface.',
        href: 'https://react-icons.github.io/react-icons/',
      },
      {
        name: 'react-markdown',
        packages: ['react-markdown'],
        description: 'Safe Markdown rendering without executable MDX.',
        href: 'https://github.com/remarkjs/react-markdown',
      },
      {
        name: 'Shiki',
        packages: ['shiki'],
        description: 'Syntax highlighting for documentation examples.',
        href: 'https://shiki.style/',
      },
      {
        name: 'react-structured',
        packages: ['react-structured'],
        description: 'Structured-data metadata for the documentation site.',
        href: 'https://github.com/ryanhefner/react-structured',
      },
      {
        name: 'Nx',
        packages: ['nx'],
        description:
          'Development tooling for workspace builds and verification.',
        href: 'https://nx.dev/',
      },
    ],
  },
] as const;
