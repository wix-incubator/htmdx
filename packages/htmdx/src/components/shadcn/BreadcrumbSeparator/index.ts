import type { HtmdxComponent } from '../../../component-definition';
import { BreadcrumbSeparator as Component } from './BreadcrumbSeparator';

export const BreadcrumbSeparator = {
  name: 'BreadcrumbSeparator',
  purpose: 'Separator between two BreadcrumbItem elements; uses a chevron when empty.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Reports</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
