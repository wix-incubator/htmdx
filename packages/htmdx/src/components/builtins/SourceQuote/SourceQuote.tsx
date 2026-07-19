import type { HTMLAttributes } from 'react';
import { renderMarkdown } from '../../../react/markdown';

type SourceQuoteProps = {
  body?: string;
  className?: string;
} & Record<string, unknown>;

export function SourceQuote({ body = '', className, ...attributes }: SourceQuoteProps) {
  return (
    <section
      {...(attributes as HTMLAttributes<HTMLElement>)}
      className={['htmdx-component htmdx-source-quote', className].filter(Boolean).join(' ')}
      data-htmdx-component="SourceQuote"
    >
      <div className="htmdx-component-header">SourceQuote</div>
      <div className="htmdx-component-body">{renderMarkdown(body)}</div>
    </section>
  );
}

export const sourceQuoteStyles = `
  .htmdx-source-quote .htmdx-component-body p:not([data-slot]) {
    font-size: 0.9375rem;
    color: var(--md-sys-color-on-surface-variant);
    border-left: 3px solid var(--md-sys-color-primary);
    padding-left: 16px;
    margin: 0;
    line-height: 1.55;
  }
  .htmdx-source-quote .htmdx-component-body {
    background: var(--md-sys-color-surface-container-lowest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 16px 20px;
  }
`;
