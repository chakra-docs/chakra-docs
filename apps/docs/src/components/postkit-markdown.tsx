import type { DocsPage } from '@chakra-docs/core';
import { NextLink } from '@chakra-docs/next/link';
import { Prose, createPostkitMdxComponents } from '@postkit/react';
import { createPostkitRemarkPlugins } from '@postkit/react/remark';
import {
  createElement,
  type AnchorHTMLAttributes,
  type ElementType,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

const remarkPlugins = createPostkitRemarkPlugins({
  postkit: { output: 'hast' },
});

function PostkitNextLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string },
) {
  return <NextLink {...props} />;
}

export interface PostkitMarkdownProps {
  page: DocsPage;
}

export function PostkitMarkdown({ page }: PostkitMarkdownProps) {
  let headingIndex = 0;
  const headings = page.headings ?? [];
  const components = createPostkitMdxComponents({
    link: {
      adapter: {
        component: PostkitNextLink,
        mapProps: (props) => props,
      },
    },
  }) as Components;

  for (const level of ['h2', 'h3', 'h4', 'h5', 'h6'] as const) {
    const Heading = components[level];

    components[level] = (props) => {
      const heading = headings[headingIndex++];

      return createElement((Heading ?? level) as ElementType, {
        ...props,
        id: heading?.id,
      });
    };
  }

  return (
    <Prose>
      <ReactMarkdown
        components={components}
        remarkPlugins={remarkPlugins}
        skipHtml
      >
        {page.body ?? ''}
      </ReactMarkdown>
    </Prose>
  );
}
