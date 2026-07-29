import { describe, expect, test } from 'vitest';
import {
  buildPrompt,
  buildRead,
  contractsFor,
  parseReply,
  scoreEdit,
} from '../bench/live/protocol';
import type { Manifest } from '../src/cli/components';
import { createComponentManifest } from '../src/component-manifest';

const manifest = createComponentManifest() as Manifest;

const SOURCE = `# Brief

<Callout>The freeze window blocks any rollout.</Callout>
`;

describe('buildRead', () => {
  test('manifest carries every component, list carries every name', () => {
    const full = buildRead(manifest, 'manifest', SOURCE);
    const list = buildRead(manifest, 'list', SOURCE);

    for (const entry of manifest.components) {
      expect(full).toContain(entry.name);
      expect(list).toContain(entry.name);
    }
    // The trade `list` makes: names and purposes, no grammar.
    expect(list).not.toContain(manifest.components[0].example);
    expect(list.length).toBeLessThan(full.length / 4);
  });

  test('used carries only what the source has, plus the pointer past it', () => {
    const read = buildRead(manifest, 'used', SOURCE);

    expect(read).toContain('Callout');
    expect(read).not.toContain('RiskTable\n\n');
    expect(read).toMatch(/\d+ other component\(s\) available/);
  });

  test('used names the absent members of a family the source started', () => {
    const read = buildRead(manifest, 'used', '<Card>\n  <CardContent>Hi</CardContent>\n</Card>\n');

    expect(read).toContain('not in this file, same family:');
    expect(read).toContain('CardHeader');
  });
});

describe('parseReply', () => {
  test('takes the document out of a fence', () => {
    const reply = parseReply('Here you go:\n\n```mdx\n# Title\n\n<Callout>Hi</Callout>\n```\n');

    expect(reply).toEqual({ source: '# Title\n\n<Callout>Hi</Callout>\n' });
  });

  test('takes the outermost fence, so a document with a code block survives', () => {
    const reply = parseReply('```mdx\n# T\n\n```js\nlet a = 1;\n```\n\ndone\n```');

    expect(reply).toEqual({ source: '# T\n\n```js\nlet a = 1;\n```\n\ndone\n' });
  });

  test('reads a follow-up request and strips the punctuation around names', () => {
    expect(parseReply('NEED: RiskTable, DataTable')).toEqual({
      need: ['RiskTable', 'DataTable'],
    });
    expect(parseReply('NEED: `RiskTable`\n')).toEqual({ need: ['RiskTable'] });
  });

  // Otherwise a model that narrates its reasoning and then answers gets scored
  // as if it had asked a question and never delivered.
  test('a fence wins over a NEED line in the same reply', () => {
    const reply = parseReply('NEED: RiskTable\n\nActually:\n```mdx\n<Callout>Hi</Callout>\n```');

    expect(reply).toEqual({ source: '<Callout>Hi</Callout>\n' });
  });

  test('an unfenced document is still a document', () => {
    expect(parseReply('# Title\n')).toEqual({ source: '# Title' });
  });
});

describe('scoreEdit', () => {
  const before = SOURCE;

  test('a valid edit that adds the required component passes', () => {
    const after = `${before}
<RiskTable>
- **Must-have:** Instant per-segment rollback.
</RiskTable>
`;

    expect(scoreEdit(manifest, before, after, ['RiskTable'])).toMatchObject({
      compiles: true,
      errors: 0,
      applied: true,
      preserved: true,
      pass: true,
    });
  });

  // The failure the eval exists to catch: the right component, invented grammar.
  test('the right component with a body the grammar rejects fails', () => {
    const after = `${before}
<RiskTable>
- **Critical:** Instant per-segment rollback.
</RiskTable>
`;
    const score = scoreEdit(manifest, before, after, ['RiskTable']);

    expect(score.applied).toBe(true);
    expect(score.errors).toBeGreaterThan(0);
    expect(score.pass).toBe(false);
  });

  test('a clean document that never made the change fails', () => {
    expect(scoreEdit(manifest, before, before, ['RiskTable'])).toMatchObject({
      errors: 0,
      applied: false,
      pass: false,
    });
  });

  test('dropping what the document already carried fails', () => {
    const after = '# Brief\n\n<RiskTable>\n- **Must-have:** Roll back.\n</RiskTable>\n';

    expect(scoreEdit(manifest, before, after, ['RiskTable'])).toMatchObject({
      applied: true,
      preserved: false,
      pass: false,
    });
  });
});

describe('buildPrompt and contractsFor', () => {
  test('the follow-up round carries the contracts the model asked for', () => {
    const extra = contractsFor(manifest, ['risktable']);
    expect(extra).toHaveLength(1);
    expect(extra[0].name).toBe('RiskTable');

    const prompt = buildPrompt('read', SOURCE, 'Add a risk breakdown', extra[0].example);
    expect(prompt).toContain('## Additional contracts');
    expect(prompt).toContain('## Change');
    expect(prompt).toContain(SOURCE);
  });

  test('the first round has no additional-contracts section', () => {
    expect(buildPrompt('read', SOURCE, 'Add a risk breakdown')).not.toContain(
      '## Additional contracts',
    );
  });
});
