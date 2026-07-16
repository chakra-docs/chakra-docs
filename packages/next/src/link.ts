'use client';

import { createElement, forwardRef } from 'react';
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link.js';

export interface NextDocsLinkProps {
  href: string;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

const LinkComponent = Link as unknown as ComponentType<Record<string, unknown>>;

export const NextLink = forwardRef<unknown, NextDocsLinkProps>(
  function NextLink(props, ref): ReactNode {
    const { href, children, className, ...rest } = props;

    return createElement(
      LinkComponent,
      {
        href,
        className,
        ref,
        ...rest,
      },
      children as ReactNode,
    );
  },
);

export { NextLink as DocsLink };
