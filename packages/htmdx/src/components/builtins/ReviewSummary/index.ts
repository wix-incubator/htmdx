import type { HtmdxComponent } from '../../../component-definition';
import { ReviewSummary as Component } from './ReviewSummary';

export const ReviewSummary = {
  name: 'ReviewSummary',
  purpose:
    'Opens a ContentReview Overview with what the review understood the feature to be and what it took as true, so a wrong premise is caught before any wording is read. Assumptions are `- claim` rows; indent `- point` rows under a claim that contains a list.',
  example:
    '<ReviewSummary whatItIs="Merchants can tag products with a brand, and shoppers can filter by it." audience="Every Wix Stores merchant, from a first store to an agency.">\n- Brands are created from the Products page.\n- The filter appears only once a brand exists.\n</ReviewSummary>',
  body: 'markdown',
  props: [
    {
      name: 'whatItIs',
      type: 'string',
      description: 'One or two sentences: what the user can now do. About "the user", never "you".',
    },
    {
      name: 'audience',
      type: 'string',
      description: 'Who meets this, and the span of them when the span changes the wording.',
    },
    {
      name: 'assumptionsNote',
      type: 'string',
      description:
        'Where the assumptions came from, stated once. Defaults to the code and your answers.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
