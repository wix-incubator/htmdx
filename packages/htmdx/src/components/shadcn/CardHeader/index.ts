import type { HtmdxComponent } from '../../../component-definition';
import { CardHeader as Component } from './CardHeader';

export const CardHeader = {
  name: 'CardHeader',
  purpose: 'Header area of a Card; holds its title, description, and optional action.',
  example:
    '<Card>\n  <CardHeader>\n    <CardTitle>Revenue</CardTitle>\n    <CardDescription>Quarterly numbers</CardDescription>\n    <CardAction><Button size="sm">Export</Button></CardAction>\n  </CardHeader>\n  <CardContent>Grew **12%** quarter over quarter.</CardContent>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
