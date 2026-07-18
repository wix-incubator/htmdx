import type { HtmdxComponent } from '../../../component-definition';
import { DecisionMatrix as Component } from './DecisionMatrix';

export const DecisionMatrix = {
  name: 'DecisionMatrix',
  body: 'markdown',
  purpose:
    'Compare options as GFM-table columns against criteria as rows. Put a ✓ in the chosen option header to highlight it. A body cell may start with `[blue]`, `[green]`, `[amber]`, `[red]`, `[gray]`, or `[purple]` to show a colored status dot.',
  example:
    '<DecisionMatrix>\n| Criterion | A — Text workaround | B — Native upload ✓ | C — Partner app |\n| --- | --- | --- | --- |\n| User fit | Partial | [green] Fully solves the intent | Partial |\n| Build effort | [green] Low | [amber] Medium | [red] High |\n</DecisionMatrix>',
  Component,
} as const satisfies HtmdxComponent;
