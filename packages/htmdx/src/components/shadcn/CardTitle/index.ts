import type { HtmdxComponent } from '../../../component-definition';
import { CardTitle as Component } from './CardTitle';

export const CardTitle = {
  name: 'CardTitle',
  purpose: 'Title line inside a CardHeader.',
  example:
    '<Card>\n  <CardHeader>\n    <CardTitle>Revenue</CardTitle>\n  </CardHeader>\n  <CardContent>Quarterly results.</CardContent>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
