import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { ReviewMockup as Component } from './ReviewMockup';

export const ReviewMockup = {
  name: 'ReviewMockup',
  purpose:
    'The recreated component, written once in HTML with inline styles (it ignores the page\u2019s own typography and Tailwind classes, so it renders like the product) and a CopyField for every piece of text. It is drawn once per version with that version’s text. Give a second mockup a name when a version proposes a different component.',
  example: contentReviewExample,
  body: 'htmdx',
  props: [
    {
      name: 'name',
      type: 'string',
      description: 'Names an alternative mockup for ReviewVersion mockup. Omit for the main one.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
