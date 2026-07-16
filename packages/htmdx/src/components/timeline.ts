import type { LabelValue } from './body-contracts';
import { componentShell, escapeHtml, inline } from './rendering';
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
  // Bold the label (before the colon), value stays regular, single line.
  const items = body
    .map(
      ({ label, value }) =>
        `<div class="htmdx-feature-item"><span class="htmdx-feature-text"><strong>${escapeHtml(
          label,
        )}:</strong> ${inline(value)}</span></div>`,
    )
    .join('');
  return componentShell(name, `<div class="htmdx-feature-grid">${items}</div>`);
}
