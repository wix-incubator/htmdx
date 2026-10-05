import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { CopyField as Component } from './CopyField';

export const CopyField = {
  name: 'CopyField',
  purpose:
    'A slot for one piece of text inside a ReviewMockup, filled from each ReviewVersion row of the same name. It is what gets diffed, edited in place, and reported in the copied message, so name it for what it is: title, body, cta.',
  example: contentReviewExample,
  body: 'none',
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
      description: 'Matches a field in each ReviewVersion.',
    },
    {
      name: 'href',
      type: 'string',
      pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
      description:
        'Name of another field that holds a URL. The text becomes a link to it, so each version can point somewhere else.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
