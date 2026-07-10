import { componentShell, renderNarrativeContent } from './rendering';
import type { HtmdxComponent } from './types';

export const card: HtmdxComponent = {
  name: 'Card',
  body: 'markdown',
  purpose: 'Present a self-contained block of supporting content.',
  example: '<Card>\n### Launch plan\nInvite beta users first.\n</Card>',
  renderer: renderCard,
};

function renderCard(name: string, body: string) {
  return componentShell(name, renderNarrativeContent(body));
}
