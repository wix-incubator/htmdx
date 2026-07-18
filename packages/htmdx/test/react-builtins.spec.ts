import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import { compileToReact } from '../src/react';

const definitions = [...Object.values(builtinDefinitions), ...Object.values(shadcnDefinitions)];

describe('bundled definitions in the React path', () => {
  test('renders Built-in Markdown and structured bodies', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<ExecutiveSummary>
Ship **one HTML file** with editable HTMDX source.
</ExecutiveSummary>

<MetricStrip>
- Format: **HTML**
- Source: **HTMDX**
</MetricStrip>`,
        { definitions },
      ),
    );

    expect(html).toContain('<strong>one HTML file</strong>');
    expect(html).toContain('HTMDX');
  });

  test('preserves apostrophes in quoted intents', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<IntentList>
- **#int-001 · Blocker · Self-Creator · Main intent:** "I want to collect a shopper's file, so I don't have to chase it over email." — frustrated, resigned → in control, relieved
</IntentList>`,
        { definitions },
      ),
    );

    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.textContent).toContain("I want to collect a shopper's file");
  });

  test('keeps Built-in body errors actionable', () => {
    expect(() =>
      renderToStaticMarkup(
        compileToReact('<MetricStrip>\nnot a label-value list\n</MetricStrip>', { definitions }),
      ),
    ).toThrow(/MetricStrip/);
  });

  test('renders Built-ins nested in composable shadcn definitions', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Card><CardContent><SourceQuote>Artifacts should remain editable.</SourceQuote></CardContent></Card>`,
        { definitions },
      ),
    );

    expect(html).toContain('Artifacts should remain editable.');
  });
});
