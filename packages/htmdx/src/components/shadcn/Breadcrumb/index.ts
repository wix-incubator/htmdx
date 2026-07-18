import type { HtmdxComponent } from '../../../component-definition';
import { Breadcrumb as Component } from './Breadcrumb';

export const Breadcrumb = {
  name: 'Breadcrumb',
  purpose: 'Navigation trail that shows the current page within a hierarchy.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Reports</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
