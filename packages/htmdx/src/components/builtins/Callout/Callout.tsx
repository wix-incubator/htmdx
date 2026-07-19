import type { HTMLAttributes } from 'react';
import { renderMarkdown } from '../../../react/markdown';

type CalloutProps = {
  body?: string;
  className?: string;
} & Record<string, unknown>;

export function Callout({ body = '', className, ...attributes }: CalloutProps) {
  return (
    <section
      {...(attributes as HTMLAttributes<HTMLElement>)}
      className={['htmdx-component htmdx-callout', className].filter(Boolean).join(' ')}
      data-htmdx-component="Callout"
    >
      <div className="htmdx-component-header">Callout</div>
      <div className="htmdx-component-body">{renderMarkdown(body)}</div>
    </section>
  );
}

export const calloutStyles = `
  .htmdx-callout .htmdx-component-body {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-secondary-container);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 18px 22px;
    font-family: var(--md-ref-typeface-brand);
  }
  .htmdx-callout .htmdx-component-body p:not([data-slot]) { margin: 0 0 8px; font-size: 1rem; color: var(--md-sys-color-on-secondary-container); }
  .htmdx-callout .htmdx-component-body p:last-child { margin-bottom: 0; }
`;
