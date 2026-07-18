import type { HtmdxComponent } from '../../../component-definition';
import { SignalGrid as Component } from './SignalGrid';

export const SignalGrid = {
  name: 'SignalGrid',
  body: 'markdown',
  purpose:
    'A grid of category cards with a colored top accent — for Why-Now signals or a Problem / Root cause / Opportunity trio. Item title is `Category | tone` (tone: blue/green/amber/red/gray/purple); the text is an optional `Headline — ` followed by the body.',
  example:
    '<SignalGrid>\n- **User pain · Escalated | red:** Paying for a workaround — merchants pay $14–60/mo and escalate to support.\n- **Competitive gap | amber:** 4 of 6 native competitors ship upload — Wix does not.\n</SignalGrid>',
  Component,
} as const satisfies HtmdxComponent;
