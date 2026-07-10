import type { LabelValue } from './body-contracts';
import { componentShell, renderFeatureCardsContent } from './rendering';
import type { HtmdxComponent } from './types';

export const timeline: HtmdxComponent = {
  name: 'Timeline',
  body: 'label-value-list',
  purpose: 'Describe milestones as labeled points in time.',
  example:
    '<Timeline>\n- July: Publish the manifest\n- August: Adopt it in validators\n</Timeline>',
  renderer: renderTimeline,
};

function renderTimeline(name: string, body: LabelValue[]) {
  return componentShell(
    name,
    renderFeatureCardsContent({
      items: body.map(({ label, value }) => `${label}: ${value}`),
      lines: body.map((_, index) => index + 1),
    }),
  );
}
