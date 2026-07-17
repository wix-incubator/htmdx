import type { HtmdxComponent } from './types';

export const timeline = {
  name: 'Timeline',
  body: 'label-value-list',
  purpose: 'Describe milestones as labeled points in time.',
  example:
    '<Timeline>\n- July: Publish the manifest\n- August: Adopt it in validators\n</Timeline>',
} as const satisfies HtmdxComponent;
