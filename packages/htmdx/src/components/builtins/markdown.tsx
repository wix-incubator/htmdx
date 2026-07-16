import type { ReactNode } from 'react';
import type { HtmdxComponent } from './types';

function kebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function markdownBuiltIn(name: string) {
  const Component = ({ children }: { children?: ReactNode }) => (
    <section className={`htmdx-component htmdx-${kebab(name)}`} data-htmdx-component={name}>
      <div className="htmdx-component-header">{name}</div>
      <div className="htmdx-component-body">{children}</div>
    </section>
  );
  Component.displayName = name;
  return Component;
}

export const executiveSummary = {
  name: 'ExecutiveSummary',
  body: 'markdown',
  purpose: 'Summarize the artifact’s most important conclusion or recommendation.',
  example:
    '<ExecutiveSummary>\nShip **one HTML file** with editable HTMDX source.\n</ExecutiveSummary>',
  component: markdownBuiltIn('ExecutiveSummary'),
} satisfies HtmdxComponent;

export const card = {
  name: 'Card',
  body: 'markdown',
  purpose: 'Present a self-contained block of supporting content.',
  example: '<Card>\n### Launch plan\nInvite beta users first.\n</Card>',
  component: markdownBuiltIn('Card'),
} satisfies HtmdxComponent;

export const callout = {
  name: 'Callout',
  body: 'markdown',
  purpose: 'Emphasize an important note, warning, or takeaway.',
  example: '<Callout>\n**Important:** Validate the artifact before publishing.\n</Callout>',
  component: markdownBuiltIn('Callout'),
} satisfies HtmdxComponent;

export const sourceQuote = {
  name: 'SourceQuote',
  body: 'markdown',
  purpose: 'Display a quotation or excerpt attributed in the surrounding content.',
  example: '<SourceQuote>\n“Artifacts should remain editable.”\n</SourceQuote>',
  component: markdownBuiltIn('SourceQuote'),
} satisfies HtmdxComponent;
