import type { HtmdxComponent } from './types';

export const decisionMatrix = {
  name: 'DecisionMatrix',
  body: 'gfm-table',
  purpose:
    'Compare solution options as columns against criteria as rows. The header lists options (first cell is the criteria corner); put a ✓ in the chosen option header to highlight its column and badge it "Chosen". A cell may lead with `[green]`/`[amber]`/`[red]` to show a colored effort dot.',
  example:
    '<DecisionMatrix>\n| Criterion | A — Text workaround | B — Native FILE_UPLOAD ✓ | C — Partner app |\n| --- | --- | --- | --- |\n| User fit | Partial | [green] Fully solves the intent | Partial |\n| Build effort | [green] Low | [amber] Medium | [red] High |\n</DecisionMatrix>',
} as const satisfies HtmdxComponent;
