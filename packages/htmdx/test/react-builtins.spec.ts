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

  describe('Foldout', () => {
    test('renders collapsed by default with the title in the summary', () => {
      const html = renderToStaticMarkup(
        compileToReact('<Foldout title="Title of accordion">\nHidden body text.\n</Foldout>', {
          definitions,
        }),
      );
      expect(html).toContain('<details');
      // Collapsed: no `open` attribute on the details element.
      expect(html).not.toContain('<details open');
      expect(html).toContain('Title of accordion');
      expect(html).toContain('Hidden body text.');
    });

    test('renders expanded when open is set', () => {
      const html = renderToStaticMarkup(
        compileToReact('<Foldout title="Shown" open>\nBody.\n</Foldout>', { definitions }),
      );
      expect(html).toContain('<details open');
    });

    test('renders nested registered components as content', () => {
      const html = renderToStaticMarkup(
        compileToReact(
          `<Foldout title="With a metric">
<MetricStrip>
- Format: **HTML**
</MetricStrip>
</Foldout>`,
          { definitions },
        ),
      );
      expect(html).toContain('data-htmdx-component="Foldout"');
      // The nested MetricStrip rendered inside the foldout body. MetricStrip
      // strips the wrapping `**` and renders its value via CSS typography
      // (not a literal <strong>), so assert on its actual markup instead.
      expect(html).toContain('data-htmdx-component="MetricStrip"');
      expect(html).toContain('>HTML<');
    });
  });
});
