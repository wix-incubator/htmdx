import type { HtmdxComponent } from '../../../component-definition';
import { TextDiff as Component } from './TextDiff';

export const TextDiff = {
  name: 'TextDiff',
  purpose:
    'Show how one piece of text changed: the after text, with rewrites highlighted, capitalization changes underlined, and cut words struck through where they were.',
  example: '<TextDiff before="Select a Gender to continue" after="Select a gender" />',
  body: 'none',
  props: [
    { name: 'before', type: 'string', required: true, description: 'The text as it was.' },
    { name: 'after', type: 'string', required: true, description: 'The text as it is now.' },
  ],
  Component,
} as const satisfies HtmdxComponent;
