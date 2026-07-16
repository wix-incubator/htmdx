import type { ReactElement, ReactNode } from 'react';
import { cn } from '../shadcn/utils';
import { renderInline } from '../markdown';

export type RawBodyProps = { body?: string };

// Structured built-ins consume their raw HTMDX body themselves (parse +
// validate through the body contracts), so the renderer must hand them the
// body string instead of parsing children as composition.
export function rawBody<P extends RawBodyProps>(render: (props: P) => ReactElement, name: string) {
  const Component = (props: P) => render(props);
  Component.displayName = name;
  return Object.assign(Component, { htmdxRawBody: true as const });
}

// Semantic wrapper: keeps each built-in identifiable in the DOM (host styling,
// tests) without imposing visible chrome — the shadcn-styled content is the
// component's whole visual.
export function Block({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section data-htmdx-component={name} className={cn('my-6', className)}>
      {children}
    </section>
  );
}

// Inline markdown (bold, code, sanitized links) rendered as real React nodes,
// shared with the markdown block renderer.
export function Inline({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

export function stripWrappingBold(value: string) {
  return value.replace(/^\*\*(.*)\*\*$/, '$1');
}

// `**Title:** rest` -> { title, text }; plain items -> { text }.
export function splitFeature(item: string): { title?: string; text: string } {
  const match = item.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
  return match ? { title: match[1].replace(/:$/, ''), text: match[2] } : { text: item };
}
