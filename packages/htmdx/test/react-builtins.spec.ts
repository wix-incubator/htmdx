import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as builtinDefinitions from '../src/components/builtins';
import * as shadcnDefinitions from '../src/components/shadcn';
import { builtInReactComponents, compileToReact } from '../src/react';
import { createReactComponentManifest } from '../src/react/component-manifest';
import { shadcnComponents } from '../src/react/shadcn';

const merged = { ...builtInReactComponents, ...shadcnComponents };
const definitions = [...Object.values(builtinDefinitions), ...Object.values(shadcnDefinitions)];

describe('built-ins in the React path', () => {
  test('renders the ExecutiveSummary shell and MetricStrip as native JSX', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<ExecutiveSummary>
Ship **one HTML file** with editable HTMDX source.
</ExecutiveSummary>

<MetricStrip>
- Format: **HTML**
- Source: **HTMDX**
</MetricStrip>`,
        { components: merged, definitions },
      ),
    );

    expect(html).toContain('data-htmdx-component="ExecutiveSummary"');
    expect(html).toContain('<strong>one HTML file</strong>');
    expect(html).toContain('data-htmdx-component="MetricStrip"');
    expect(html).toContain('HTMDX');
  });

  test('preserves apostrophes in quoted intents', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<IntentList>
- **#int-001 · Blocker · Self-Creator · Main intent:** "I want to collect a shopper's file, so I don't have to chase it over email." — frustrated, resigned → in control, relieved
</IntentList>`,
        { components: merged },
      ),
    );
    const container = document.createElement('div');
    container.innerHTML = html;

    expect(container.textContent).toContain(
      "I want to collect a shopper's file, so I don't have to chase it over email.",
    );
  });

  test('built-in body contracts still validate in the React path', () => {
    expect(() =>
      renderToStaticMarkup(
        compileToReact('<MetricStrip>\nnot a label-value list\n</MetricStrip>', {
          components: merged,
        }),
      ),
    ).toThrow(/MetricStrip/);
  });

  test('built-ins nested inside shadcn bodies receive their raw body', () => {
    const html = renderToStaticMarkup(
      compileToReact(
        `<Card>
  <CardContent>
    <SourceQuote>
Artifacts should remain editable.
    </SourceQuote>
  </CardContent>
</Card>`,
        { components: merged, definitions },
      ),
    );

    expect(html).toContain('data-slot="card"');
    expect(html).toContain('htmdx-source-quote');
    expect(html).toContain('Artifacts should remain editable.');
  });

  test('react manifest covers exactly the merged runtime catalog', () => {
    const manifest = createReactComponentManifest();
    const manifestNames = manifest.components.map((component) => component.name).toSorted();
    const catalogNames = [
      ...Object.keys(merged),
      ...definitions.map((definition) => definition.name),
    ].toSorted();
    expect(manifestNames).toEqual(catalogNames);
    expect(manifest.format).toBe('htmdx-react@1');
  });
});
