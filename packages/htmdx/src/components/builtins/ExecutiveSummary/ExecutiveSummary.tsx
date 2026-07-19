// ExecutiveSummary implementation: a markdown-bodied shell that owns its own
// Markdown rendering (the runtime hands the raw body string to `markdown`-body
// components) and its presentation below. Internal to this folder — the public
// contract is the definition exported from ./index.ts.
import type { HTMLAttributes } from 'react';
import { renderMarkdown } from '../../../react/markdown';

type ExecutiveSummaryProps = {
  body?: string;
  className?: string;
} & Record<string, unknown>;

export function ExecutiveSummary({ body = '', className, ...attributes }: ExecutiveSummaryProps) {
  return (
    <section
      {...(attributes as HTMLAttributes<HTMLElement>)}
      className={['htmdx-component htmdx-executive-summary', className].filter(Boolean).join(' ')}
      data-htmdx-component="ExecutiveSummary"
    >
      <div className="htmdx-component-header">ExecutiveSummary</div>
      <div className="htmdx-component-body">{renderMarkdown(body)}</div>
    </section>
  );
}

export const executiveSummaryStyles = `
  .htmdx-executive-summary .htmdx-component-body {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-surface);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: 22px 26px;
    font-family: var(--md-ref-typeface-brand);
  }
  .htmdx-executive-summary .htmdx-component-body p:not([data-slot]) {
    margin: 0 0 12px;
    font-size: 1rem;
    line-height: 1.55;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-executive-summary .htmdx-component-body p:not([data-slot]):last-child {
    margin-bottom: 0;
  }
`;
