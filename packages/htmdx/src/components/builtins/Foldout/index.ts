import type { HtmdxComponent } from '../../../component-definition';
import { Foldout as Component } from './Foldout';

export const Foldout = {
  name: 'Foldout',
  purpose:
    'A collapsible panel: a titled header that expands on click to reveal flexible content (text, tables, charts, or any nested component). Collapsed by default; stack multiple for a group.',
  example:
    '<Foldout title="Additional details">\nAny content — text, a table, a chart, or any nested component.\n</Foldout>',
  body: 'htmdx',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'The header text shown in the summary row. Supports inline markdown.',
    },
    {
      name: 'open',
      type: 'boolean',
      default: false,
      description: 'Render the panel expanded on load. Defaults to collapsed.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
