import type { HtmdxComponent } from '../../../component-definition';
import { Alert as Component } from './Alert';

export const Alert = {
  name: 'Alert',
  purpose: 'Callout banner for a titled note or warning.',
  example:
    '<Alert>\n  <AlertTitle>Heads up</AlertTitle>\n  <AlertDescription>This artifact is display-only.</AlertDescription>\n</Alert>',
  body: 'htmdx',
  props: [
    {
      name: 'variant',
      type: 'string',
      values: ['default', 'destructive'],
      default: 'default',
      description: 'Visual emphasis of the alert.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
