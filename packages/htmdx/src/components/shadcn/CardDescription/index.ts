import type { HtmdxComponent } from '../../../component-definition';
import { CardDescription as Component } from './CardDescription';

export const CardDescription = {
  name: 'CardDescription',
  purpose: 'Supporting description line inside a CardHeader.',
  example:
    '<Card>\n  <CardHeader>\n    <CardTitle>Revenue</CardTitle>\n    <CardDescription>Audited quarterly numbers</CardDescription>\n  </CardHeader>\n  <CardContent>Quarterly results.</CardContent>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
