import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { ReviewScreen as Component } from './ReviewScreen';

export const ReviewScreen = {
  name: 'ReviewScreen',
  purpose:
    'A screenshot of the screen reviewed elements sit on, declared once inside ContentReview and named by each ReviewElement screen prop.',
  example: contentReviewExample.replace(
    '<ReviewElement name="Empty state"',
    '<ReviewScreen name="products" src="https://example.com/products.png" alt="Products page with the new Brand filter" />\n\n<ReviewElement name="Empty state" screen="products"',
  ),
  body: 'none',
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Referenced by ReviewElement screen.',
    },
    {
      name: 'src',
      type: 'string',
      required: true,
      description: 'An https URL or a data:image URI. Capture at 2x so the copy stays legible.',
    },
    { name: 'alt', type: 'string', required: true, description: 'What the screenshot shows.' },
  ],
  Component,
} as const satisfies HtmdxComponent;
