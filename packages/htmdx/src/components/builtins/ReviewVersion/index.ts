import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { ReviewVersion as Component } from './ReviewVersion';

export const ReviewVersion = {
  name: 'ReviewVersion',
  purpose:
    'The text of one version, as \'- field: text\' rows matching the mockup’s CopyField names. The first, current="true", is today’s text; the rest are numbered Version 1, 2, … in order. A field a version leaves out keeps today’s text.',
  example: contentReviewExample,
  body: 'markdown',
  props: [
    { name: 'current', type: 'boolean', default: false, description: 'Marks today’s text.' },
    {
      name: 'label',
      type: 'string',
      description: 'The version’s angle in 2-3 words, without a number.',
    },
    {
      name: 'why',
      type: 'string',
      description: 'One sentence: why this version. Inline Markdown.',
    },
    { name: 'assumptions', type: 'json', description: 'What this wording takes as true: ["..."].' },
    {
      name: 'sourced',
      type: 'string',
      description:
        'Where wording the current text never said came from, so a fact that was looked up reads differently from one that was invented.',
    },
    {
      name: 'mockup',
      type: 'string',
      description:
        'name of an alternative ReviewMockup, when this version proposes a different component.',
    },
    {
      name: 'updated',
      type: 'string',
      description:
        'Set when you rewrite a version from a comment: one line on what changed. Remove it once the version is final.',
    },
    {
      name: 'edited',
      type: 'json',
      description:
        'The reader’s own wording per field, verbatim, as sent back to you: {"cta":"Add your first brand"}. Rendered as plain text.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
