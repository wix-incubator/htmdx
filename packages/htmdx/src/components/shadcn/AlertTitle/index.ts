import type { HtmdxComponent } from '../../../component-definition';
import { AlertTitle as Component } from './AlertTitle';

export const AlertTitle = {
  name: 'AlertTitle',
  purpose: 'Title line inside an Alert.',
  example:
    '<Alert>\n  <AlertTitle>Heads up</AlertTitle>\n  <AlertDescription>Review this note before publishing.</AlertDescription>\n</Alert>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
