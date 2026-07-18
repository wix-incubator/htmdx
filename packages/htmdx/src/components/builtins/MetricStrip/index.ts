import type { HtmdxComponent } from '../../../component-definition';
import { MetricStrip as Component } from './MetricStrip';

export const MetricStrip = {
  name: 'MetricStrip',
  body: 'markdown',
  purpose:
    "Show a compact set of labeled headline values written as '- label: value' rows. A leading trend glyph (↑ up/green, ↓ down/red, ⊘ guardrail/amber) is colored automatically; an ` — ` or ` · ` in the value renders the remainder as a muted caption.",
  example:
    '<MetricStrip>\n- ↑ Active stores using upload: **baseline 0** — post-launch adopter cohort\n- ↓ File-upload support tickets: **55** · 3 months post-launch\n- ⊘ Buyer checkout-completion rate: **guardrail** — hold at or above baseline\n</MetricStrip>',
  Component,
} as const satisfies HtmdxComponent;
