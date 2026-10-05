import type { HtmdxComponent } from '../../../component-definition';
import { contentReviewExample } from '../shared/review-example';
import { ReviewElement as Component } from './ReviewElement';

export const ReviewElement = {
  name: 'ReviewElement',
  purpose:
    'One component whose copy is reviewed, inside ContentReview. Holds a ReviewMockup, a <ReviewVersion current="true"> with today’s text, then the proposed versions. Use changed="false" for an element you checked and left alone.',
  example: contentReviewExample,
  body: 'htmdx',
  props: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Unique within the review. Decisions are saved and reported under it.',
    },
    { name: 'description', type: 'string', description: 'One line: when the user sees it.' },
    { name: 'group', type: 'string', description: 'Area of the product, used as a nav heading.' },
    { name: 'screen', type: 'string', description: 'Name of the ReviewScreen it sits on.' },
    {
      name: 'highlight',
      type: 'json',
      description: 'Where it sits on the screenshot, in percent: {"x":10,"y":40,"w":30,"h":12}.',
    },
    {
      name: 'changed',
      type: 'boolean',
      default: true,
      description: 'false lists it on the Overview as reviewed with no change.',
    },
    {
      name: 'final',
      type: 'string',
      pattern: '^(current|[1-9][0-9]*)$',
      description:
        'The version the reader settled on: its number, as in "Version 2", or "current" to keep today’s text.',
    },
    {
      name: 'flag',
      type: 'string',
      description: 'A design gap the copy alone cannot fix, pinned on the current text.',
    },
    {
      name: 'flagAnchor',
      type: 'string',
      description:
        'The CopyField name the flag points at. Omit when it is about the whole component.',
    },
    {
      name: 'link',
      type: 'json',
      description: 'One link for this element: {"label":"Prototype","url":"https://..."}.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
