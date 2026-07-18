import type { HtmdxComponent } from '../../../component-definition';
import { BreadcrumbList as Component } from './BreadcrumbList';

export const BreadcrumbList = {
  name: 'BreadcrumbList',
  purpose: 'Ordered list that lays out the items and separators in a Breadcrumb.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Reports</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
