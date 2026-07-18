import type { HtmdxComponent } from '../../../component-definition';
import { BreadcrumbPage as Component } from './BreadcrumbPage';

export const BreadcrumbPage = {
  name: 'BreadcrumbPage',
  purpose: 'Current, non-clickable page inside a BreadcrumbItem.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Reports</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
