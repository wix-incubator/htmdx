import type { HtmdxComponent } from '../../../component-definition';
import { BreadcrumbEllipsis as Component } from './BreadcrumbEllipsis';

export const BreadcrumbEllipsis = {
  name: 'BreadcrumbEllipsis',
  purpose: 'Collapsed-items marker inside a BreadcrumbItem.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Reports</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'none',
  Component,
} as const satisfies HtmdxComponent;
