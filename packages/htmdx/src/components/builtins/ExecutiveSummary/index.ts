import type { HtmdxComponent } from '../../../component-definition';
import { ExecutiveSummary as Component } from './ExecutiveSummary';

export const ExecutiveSummary = {
  name: 'ExecutiveSummary',
  purpose: 'Summarize the artifact’s most important conclusion or recommendation.',
  example:
    '<ExecutiveSummary>\nShip **one HTML file** with editable HTMDX source.\n</ExecutiveSummary>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
