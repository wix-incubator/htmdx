import type { HtmdxComponent } from './types';

export const intentList: HtmdxComponent = {
  name: 'IntentList',
  body: 'markdown-list-cards',
  purpose:
    'Group user intents by priority (Blocker/Critical/Nice to have) with a persona · type header, the intent quote, and current → expected feeling chips (red → green). Each item title is `#id · Priority · Persona · Type`; the text is the quote followed by `negative, negative → positive, positive`. Append an optional `· note: …` to flag an intent with a caution strip (e.g. a guardrail) inside its card.',
  example:
    '<IntentList>\n- **#int-001 · Blocker · Self-Creator · Main intent:** "I want to collect a shopper\'s file at purchase, so the attachment is tied to the order." — frustrated, resigned → in control, relieved\n- **#int-001 · Critical · Shopper · Main intent:** "I want to attach my file while buying, so the seller gets exactly what I mean." — uncertain, friction → understood, reassured · note: Required-upload step is an unmeasured conversion risk — guardrail KPI required at launch\n</IntentList>',
};
