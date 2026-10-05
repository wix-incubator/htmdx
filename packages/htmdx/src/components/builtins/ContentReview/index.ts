import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { ContentReview as Component } from './ContentReview';

export const ContentReview = {
  name: 'ContentReview',
  purpose:
    'Review UI copy: each ReviewElement shows a recreated component with its current text and 2-3 rewritten versions, word-diffed against the current text. Readers select a version, edit its text in place, comment, or ask for another version, then copy every decision as one message for their agent. Non-element children render on the Overview.',
  example: contentReviewExample,
  body: 'htmdx',
  props: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'What is being reviewed. Heads the copied message and keys saved decisions.',
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
