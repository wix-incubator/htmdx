import type { HtmdxComponent } from '../../../component-definition';
import { pagesExample } from '../shared/pages-example';
import { Pages as Component } from './Pages';

export const Pages = {
  name: 'Pages',
  purpose:
    'Content read one page at a time: an overview (anything before the first Page, then a tile per page) and one Page open at a time, with a nav grouped by each page’s group. Under `layout: creator-kit` the nav takes the page’s left rail and the hero shrinks while a page is open.',
  example: pagesExample,
  body: 'htmdx',
  props: [
    {
      name: 'tilesLabel',
      type: 'string',
      default: 'Pages',
      description: 'Heading over the overview’s page tiles, e.g. "Screens reviewed".',
    },
    {
      name: 'otherLabel',
      type: 'string',
      default: 'Also covered',
      description: 'Heading over pages kept out of the nav (nav="false").',
    },
  ],
  pageNav: true,
  Component,
} as const satisfies HtmdxComponent;
