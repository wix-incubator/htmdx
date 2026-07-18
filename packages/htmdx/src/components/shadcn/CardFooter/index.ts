import type { HtmdxComponent } from '../../../component-definition';
import { CardFooter as Component } from './CardFooter';

export const CardFooter = {
  name: 'CardFooter',
  purpose: 'Footer row of a Card, usually holding actions or status labels.',
  example:
    '<Card>\n  <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>\n  <CardContent>Quarterly results.</CardContent>\n  <CardFooter><Button variant="outline" size="sm">Details</Button></CardFooter>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
