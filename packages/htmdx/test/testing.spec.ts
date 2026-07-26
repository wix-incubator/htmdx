import { describe, expect, test } from 'vitest';
import { extractSource, snapshot } from '../src/testing';

const ARTIFACT = [
  '<!doctype html>',
  '<html>',
  '  <body>',
  '    <script type="text/htmdx" id="doc">',
  '# Report',
  '',
  '<Foldout title="Details">Ship it.</Foldout>',
  '    </script>',
  '  </body>',
  '</html>',
  '',
].join('\n');

describe('extractSource', () => {
  test('pulls the HTMDX source out of an artifact', () => {
    expect(extractSource(ARTIFACT).trim()).toBe(
      '# Report\n\n<Foldout title="Details">Ship it.</Foldout>',
    );
  });

  test('throws when the html has no HTMDX source block', () => {
    expect(() => extractSource('<html><body>nothing</body></html>')).toThrow(
      'no <script type="text/htmdx"> block found',
    );
  });
});

describe('snapshot', () => {
  // Structure mode is the default so a consumer's snapshots track their own
  // document, not the runtime's markup — a CSS or wrapper change upstream
  // must not churn every downstream snapshot.
  test('describes the component tree by default', () => {
    expect(snapshot(extractSource(ARTIFACT))).toBe(
      ['markdown "# Report"', '<Foldout title="Details">', '  text "Ship it."'].join('\n'),
    );
  });

  test('describes nested components', () => {
    const source = '<Card>\n  <CardTitle>Costs</CardTitle>\n</Card>\n';

    expect(snapshot(source)).toBe(['<Card>', '  <CardTitle>', '    text "Costs"'].join('\n'));
  });

  test('renders markup in html mode', () => {
    const html = snapshot('<Foldout title="Details">Ship it.</Foldout>\n', { mode: 'html' });

    expect(html).toContain('Ship it.');
    expect(html).toMatch(/^</);
  });

  test('surfaces invalid source as a thrown error rather than an empty snapshot', () => {
    expect(() => snapshot('<Callout tone="x">Body.</Callout>\n')).toThrow(/unknown prop/);
  });
});
