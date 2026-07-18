import type { HtmdxComponent } from '../../../component-definition';
import { Card as Component } from './Card';

export const Card = {
  name: 'Card',
  purpose: 'Container for a self-contained block with optional header, content, and footer areas.',
  example:
    '<Card>\n  <CardHeader>\n    <CardTitle>Revenue</CardTitle>\n    <CardDescription>Quarterly numbers</CardDescription>\n  </CardHeader>\n  <CardContent>Grew **12%** quarter over quarter.</CardContent>\n  <CardFooter><Button variant="outline" size="sm">Details</Button></CardFooter>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
