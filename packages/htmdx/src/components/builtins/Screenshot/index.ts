import type { HtmdxComponent } from '../../../component-definition';
import { Screenshot as Component } from './Screenshot';

export const Screenshot = {
  name: 'Screenshot',
  purpose:
    'A screenshot that opens full size on click. With a highlight it becomes a small thumbnail centred on one ringed region, to show where something sits on a screen. Inside Pages, declare a screen once with name and reuse it with use, so it is embedded once.',
  example:
    '<Screenshot src="https://example.com/settings.png" alt="Settings page" highlight=\'{"x":10,"y":40,"w":30,"h":12}\' />',
  body: 'none',
  props: [
    {
      name: 'src',
      type: 'string',
      description: 'An https URL or a data:image URI. Capture at 2x so text stays legible.',
    },
    { name: 'alt', type: 'string', description: 'What the screenshot shows.' },
    {
      name: 'name',
      type: 'string',
      description:
        'Inside Pages: declares a screenshot pages reuse by this name. Not drawn itself.',
    },
    { name: 'use', type: 'string', description: 'Inside Pages: reuses a screenshot by name.' },
    {
      name: 'highlight',
      type: 'json',
      description: 'The region to ring, in percent of the image: {"x":10,"y":40,"w":30,"h":12}.',
    },
    {
      name: 'caption',
      type: 'string',
      default: 'View in context',
      description: 'The thumbnail’s label.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
