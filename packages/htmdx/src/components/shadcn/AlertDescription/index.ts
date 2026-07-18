import type { HtmdxComponent } from '../../../component-definition';
import { AlertDescription as Component } from './AlertDescription';

export const AlertDescription = {
  name: 'AlertDescription',
  purpose: 'Supporting body text inside an Alert.',
  example:
    '<Alert>\n  <AlertTitle>Heads up</AlertTitle>\n  <AlertDescription>Review this note before publishing.</AlertDescription>\n</Alert>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
