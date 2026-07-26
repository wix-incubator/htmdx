// htmdx components — reads the component contract this exact runtime ships.
// The manifest is generated at build time into dist/components.json, next to
// the bin, so the answer always matches the version doing the answering.

import { readFile } from 'node:fs/promises';

export type ManifestProp = {
  name: string;
  type: string;
  description?: string;
  default?: unknown;
};

export type ManifestComponent = {
  name: string;
  purpose: string;
  example: string;
  body: 'markdown' | 'htmdx' | 'none';
  source: string;
  props?: ManifestProp[];
};

export type Manifest = {
  format: string;
  runtime: string;
  note?: string;
  components: ManifestComponent[];
};

export async function loadManifest(): Promise<Manifest> {
  const url = new URL('./components.json', import.meta.url);
  return JSON.parse(await readFile(url, 'utf8')) as Manifest;
}

export function findComponent(manifest: Manifest, name: string): ManifestComponent | undefined {
  const wanted = name.toLowerCase();
  return manifest.components.find((entry) => entry.name.toLowerCase() === wanted);
}

// A miss is usually a typo or a half-remembered name, so point at the closest
// things rather than making the user re-read the whole list. Substring catches
// the half-remembered case ("chart"), edit distance catches the typo ("Calout").
export function suggestNames(manifest: Manifest, name: string): string[] {
  const wanted = name.toLowerCase();
  return manifest.components
    .map((entry) => {
      const candidate = entry.name.toLowerCase();
      const related = candidate.includes(wanted) || wanted.includes(candidate);
      return { name: entry.name, distance: related ? 0 : editDistance(candidate, wanted) };
    })
    .filter((entry) => entry.distance <= 2)
    .toSorted((left, right) => left.distance - right.distance)
    .map((entry) => entry.name)
    .slice(0, 5);
}

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      current[column] = Math.min(substitution, previous[column] + 1, current[column - 1] + 1);
    }
    previous = current;
  }

  return previous[right.length];
}

export function formatList(components: ManifestComponent[], runtime: string): string {
  const lines = [`${components.length} components in ${runtime}`, ''];
  const bySource = new Map<string, ManifestComponent[]>();

  for (const entry of components) {
    const group = bySource.get(entry.source) ?? [];
    group.push(entry);
    bySource.set(entry.source, group);
  }

  const width = Math.max(...components.map((entry) => entry.name.length));
  for (const [source, group] of bySource) {
    lines.push(`${source} (${group.length})`);
    for (const entry of group) {
      lines.push(`  ${entry.name.padEnd(width)}  ${firstSentence(entry.purpose)}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function formatComponent(entry: ManifestComponent): string {
  const lines = [entry.name, '', entry.purpose, '', `body: ${entry.body}  source: ${entry.source}`];

  if (entry.props?.length) {
    lines.push('', 'props:');
    for (const prop of entry.props) {
      const fallback =
        prop.default === undefined ? '' : ` (default ${JSON.stringify(prop.default)})`;
      lines.push(`  ${prop.name}: ${prop.type}${fallback}`);
      if (prop.description) {
        lines.push(`    ${prop.description}`);
      }
    }
  }

  lines.push('', 'example:', ...entry.example.split('\n').map((line) => `  ${line}`));
  return `${lines.join('\n')}\n`;
}

function firstSentence(purpose: string): string {
  const stop = purpose.search(/\.\s|\.$/);
  return stop === -1 ? purpose : purpose.slice(0, stop + 1);
}
