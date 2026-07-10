import { componentShell, renderNarrativeContent } from './rendering';
import type { HtmdxComponent } from './types';

export const executiveSummary: HtmdxComponent = {
  name: 'ExecutiveSummary',
  body: 'markdown',
  purpose: 'Summarize the artifact’s most important conclusion or recommendation.',
  example:
    '<ExecutiveSummary>\nShip **one HTML file** with editable HTMDX source.\n</ExecutiveSummary>',
  renderer: renderExecutiveSummary,
};

function renderExecutiveSummary(name: string, body: string) {
  return componentShell(name, renderNarrativeContent(body));
}
