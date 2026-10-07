import type { HtmdxComponent } from '../../../component-definition';
import { pagesExample } from '../shared/pages-example';
import { Page as Component } from './Page';

export const Page = {
  name: 'Page',
  purpose:
    'One page inside Pages. A Screenshot directly inside it sits beside its title; the rest is its body, and a small preview of the body is its overview tile (Variants previews as its current variant).',
  example: pagesExample,
  body: 'htmdx',
  props: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'The page’s name in the nav and heading.',
    },
    { name: 'description', type: 'string', description: 'One line under the title.' },
    { name: 'group', type: 'string', description: 'Nav heading the page sits under.' },
    {
      name: 'nav',
      type: 'boolean',
      default: true,
      description:
        'false keeps the page out of the nav and tiles and lists it on the overview instead.',
    },
    {
      name: 'link',
      type: 'json',
      description: 'One link for this page: {"label":"Prototype","url":"https://..."}.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
