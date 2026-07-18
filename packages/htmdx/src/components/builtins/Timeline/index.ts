import type { HtmdxComponent } from '../../../component-definition';
import { Timeline as Component } from './Timeline';

export const Timeline = {
  name: 'Timeline',
  body: 'markdown',
  purpose:
    "Describe milestones as labeled points in time written as '- label: value' rows, splitting each row at its first colon.",
  example:
    '<Timeline>\n- July: Publish the manifest\n- August: Adopt it in validators\n</Timeline>',
  Component,
} as const satisfies HtmdxComponent;
