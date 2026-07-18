import type { HtmdxComponent } from '../../../component-definition';
import { BreadcrumbLink as Component } from './BreadcrumbLink';

export const BreadcrumbLink = {
  name: 'BreadcrumbLink',
  purpose: 'Link to an ancestor page inside a BreadcrumbItem.',
  example:
    '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Reports</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
  body: 'htmdx',
  props: [
    {
      name: 'href',
      type: 'string',
      required: true,
      description: 'URL of the ancestor page.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
