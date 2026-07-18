import type { HTMLAttributes, ReactNode } from 'react';
import { renderInline } from '../../../react/markdown';
import { cn } from '../../../react/shadcn/utils';

export type StructuredBodyProps = {
  body?: string;
  className?: string;
} & Record<string, unknown>;

export function StructuredBlock({
  name,
  className,
  children,
  ...attributes
}: {
  name: string;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <section
      {...(attributes as HTMLAttributes<HTMLElement>)}
      data-htmdx-component={name}
      className={cn('htmdx-component', className)}
    >
      {children}
    </section>
  );
}

export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

export function stripWrappingBold(value: string) {
  return value.replace(/^\*\*(.*)\*\*$/, '$1');
}

export function splitFeature(item: string): { title?: string; text: string } {
  const match = item.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
  return match ? { title: match[1].replace(/:$/, ''), text: match[2] } : { text: item };
}
