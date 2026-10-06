import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { ContentReview as Component } from './ContentReview';

export const ContentReview = {
  name: 'ContentReview',
  purpose:
    'Review UI copy: each ReviewElement shows a recreated component with its current text and 2-3 rewritten versions, word-diffed against the current text. Readers select a version, edit its text in place, comment, or ask for another version, then copy every decision as one message for their agent. Non-element children render on the Overview. It draws the whole page (nav column and header), so use it with `layout: blank`.',
  example: contentReviewExample,
  body: 'htmdx',
  props: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description:
        'What is being reviewed, e.g. the feature name. The header title; it also heads the copied message and keys saved decisions.',
    },
    {
      name: 'subtitle',
      type: 'string',
      description:
        'One line under the title: where the elements live, e.g. "Wix Stores · Products page".',
    },
    {
      name: 'badge',
      type: 'string',
      default: 'Content review',
      description: 'The small label above the title.',
    },
    {
      name: 'logo',
      type: 'string',
      values: ['creator-kit'],
      description: 'A built-in logo for the bottom of the nav column.',
    },
    {
      name: 'revision',
      type: 'number',
      min: 0,
      default: 0,
      description:
        'Raise by one every time you apply the reader’s decisions and republish, so comments already acted on stop being sent.',
    },
    {
      name: 'links',
      type: 'json',
      description:
        'Links to the real thing, first one solid: [{"label":"Go to prototype","url":"https://..."}]. Label the action, not the noun, and leave out any link you cannot justify in a few words.',
    },
    {
      name: 'copyHint',
      type: 'string',
      description: 'Tooltip on the Copy to agent button: what the copied message is for.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
