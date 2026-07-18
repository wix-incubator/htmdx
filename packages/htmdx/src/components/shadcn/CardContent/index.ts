import type { HtmdxComponent } from '../../../component-definition';
import { CardContent as Component } from './CardContent';

export const CardContent = {
  name: 'CardContent',
  purpose: 'Main body of a Card; accepts Markdown, HTML, and nested HTMDX components.',
  example:
    '<Card>\n  <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>\n  <CardContent>Grew **12%** quarter over quarter. <Badge variant="secondary">audited</Badge></CardContent>\n</Card>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
