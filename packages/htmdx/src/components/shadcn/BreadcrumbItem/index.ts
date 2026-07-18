import type { HtmdxComponent } from '../../../component-definition';
import { BreadcrumbItem as Component } from './BreadcrumbItem';

export const BreadcrumbItem = {
  name: 'BreadcrumbItem',
  purpose: 'One linked or current-page entry inside a BreadcrumbList.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/reports">Reports</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Quarterly</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
