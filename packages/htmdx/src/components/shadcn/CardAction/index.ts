import type { HtmdxComponent } from '../../../component-definition';
import { CardAction as Component } from './CardAction';

export const CardAction = {
  name: 'CardAction',
  purpose: 'Action area aligned at the end of a CardHeader.',
  example:
    '<Card>\n  <CardHeader>\n    <CardTitle>Revenue</CardTitle>\n    <CardAction><Button variant="outline" size="sm">Export</Button></CardAction>\n  </CardHeader>\n  <CardContent>Quarterly results.</CardContent>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
