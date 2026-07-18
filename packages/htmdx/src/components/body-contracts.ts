export type LabelValue = { label: string; value: string };
export type LabelNumber = { label: string; value: number };
export type GfmTable = { header: string[]; rows: string[][] };
export type MarkdownListCards = { items: string[]; lines: number[] };

type HtmdxBodyFormat =
  | 'markdown'
  | 'label-value-list'
  | 'label-number-list'
  | 'gfm-table'
  | 'markdown-list-cards';

type ParsedBodyByFormat = {
  markdown: string;
  'label-value-list': LabelValue[];
  'label-number-list': LabelNumber[];
  'gfm-table': GfmTable;
  'markdown-list-cards': MarkdownListCards;
};

type HtmdxParsedBody = ParsedBodyByFormat[HtmdxBodyFormat];

export class BodyContractError extends Error {
  constructor(
    message: string,
    readonly expected: string,
    readonly line?: number,
    readonly column?: number,
  ) {
    super(message);
  }
}

const EXPECTED = {
  markdown: 'non-empty Markdown',
  'label-value-list': "one or more '- label: value' rows with non-empty labels and values",
  'label-number-list':
    "one or more '- label: number' rows whose values are finite, non-negative decimals",
  'gfm-table': 'a GFM table with a header, separator, and at least one consistently sized data row',
  'markdown-list-cards': "one or more non-empty '- item' rows",
} as const satisfies Record<HtmdxBodyFormat, string>;

export function parseComponentBody<F extends HtmdxBodyFormat>(
  componentName: string,
  format: F,
  body: string,
  validate?: (body: ParsedBodyByFormat[F]) => void,
): ParsedBodyByFormat[F] {
  try {
    validateGlobalBody(body);
    const parsed = parseByFormat(format, body);
    validate?.(parsed);
    return parsed;
  } catch (error) {
    if (!(error instanceof BodyContractError)) {
      throw error;
    }

    const location = error.line
      ? ` at body line ${error.line}${error.column ? `, column ${error.column}` : ''}`
      : '';
    throw new Error(
      `Invalid body for <${componentName}>${location}: ${error.message}; expected ${error.expected}.`,
      { cause: error },
    );
  }
}

function parseByFormat<F extends HtmdxBodyFormat>(format: F, body: string): ParsedBodyByFormat[F] {
  const parsed: HtmdxParsedBody =
    format === 'markdown'
      ? body.trim()
      : format === 'label-value-list'
        ? parseLabelValueList(body)
        : format === 'label-number-list'
          ? parseLabelNumberList(body)
          : format === 'gfm-table'
            ? parseGfmTable(body)
            : parseMarkdownListCards(body);
  return parsed as ParsedBodyByFormat[F];
}

export function validateGlobalBody(body: string) {
  if (!body.trim()) {
    throw new BodyContractError('body is empty', 'non-empty content');
  }

  const syntax = markdownSyntaxSource(body);
  const lines = syntax.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const moduleSyntax = line.match(/^\s*(import|export)\b/);
    if (moduleSyntax) {
      throw new BodyContractError(
        `${moduleSyntax[1]} statements are not allowed`,
        'content without imports or exports',
        index + 1,
        (moduleSyntax.index ?? 0) + 1,
      );
    }
  }

  const expression = firstMatch(syntax, /[{}]/);
  if (expression) {
    throw new BodyContractError(
      'MDX expressions are not allowed',
      'content without brace expressions',
      expression.line,
      expression.column,
    );
  }

  const jsx = firstMatch(syntax, /<\/?[A-Za-z][A-Za-z0-9]*\b|<>|<\/>/);
  if (jsx) {
    throw new BodyContractError(
      'nested JSX is not allowed',
      'one-level HTMDX without nested JSX',
      jsx.line,
      jsx.column,
    );
  }
}

export function parseLabelValueList(body: string): LabelValue[] {
  return parseStrictList(body, EXPECTED['label-value-list'], (item, line) => {
    const separator = item.indexOf(':');
    const label = separator < 0 ? '' : item.slice(0, separator).trim();
    const value = separator < 0 ? '' : item.slice(separator + 1).trim();
    if (!label || !value) {
      throw new BodyContractError(
        'each row must have a non-empty label and value separated by the first colon',
        EXPECTED['label-value-list'],
        line,
      );
    }
    return { label, value };
  });
}

export function parseLabelNumberList(body: string): LabelNumber[] {
  return parseStrictList(body, EXPECTED['label-number-list'], (item, line) => {
    const separator = item.indexOf(':');
    const label = separator < 0 ? '' : item.slice(0, separator).trim();
    const rawValue = separator < 0 ? '' : item.slice(separator + 1).trim();
    if (!label) {
      throw new BodyContractError(
        'each row must have a non-empty label',
        EXPECTED['label-number-list'],
        line,
      );
    }
    if (!/^\d+(?:\.\d+)?$/.test(rawValue)) {
      throw new BodyContractError(
        `value "${rawValue}" is not a non-negative decimal`,
        EXPECTED['label-number-list'],
        line,
      );
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new BodyContractError('each value must be finite', EXPECTED['label-number-list'], line);
    }
    return { label, value };
  });
}

export function parseGfmTable(body: string): GfmTable {
  const lines = nonEmptyLines(body);
  if (lines.length < 3) {
    throw new BodyContractError(
      'table must include a header, separator, and at least one data row',
      EXPECTED['gfm-table'],
    );
  }

  const header = splitTableLine(lines[0].text);
  if (header.length === 0 || header.some((cell) => !cell)) {
    throw new BodyContractError(
      'header cells must be non-empty',
      EXPECTED['gfm-table'],
      lines[0].line,
    );
  }

  const separator = splitTableLine(lines[1].text);
  if (separator.length !== header.length || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))) {
    throw new BodyContractError(
      'separator must have one valid --- cell per header column',
      EXPECTED['gfm-table'],
      lines[1].line,
    );
  }

  const rows = lines.slice(2).map(({ text, line }) => {
    const cells = splitTableLine(text);
    if (cells.length !== header.length) {
      throw new BodyContractError(
        `data row has ${cells.length} columns but the header has ${header.length}`,
        EXPECTED['gfm-table'],
        line,
      );
    }
    return cells;
  });
  return { header, rows };
}

export function parseMarkdownListCards(body: string): MarkdownListCards {
  const entries = parseStrictList(body, EXPECTED['markdown-list-cards'], (item, line) => ({
    item,
    line,
  }));
  return {
    items: entries.map(({ item }) => item),
    lines: entries.map(({ line }) => line),
  };
}

function parseStrictList<T>(
  body: string,
  expected: string,
  parseItem: (item: string, line: number) => T,
): T[] {
  const items: T[] = [];
  for (const { text, line } of nonEmptyLines(body)) {
    if (!/^\s*-\s+/.test(text)) {
      throw new BodyContractError('non-empty lines must be list items', expected, line);
    }
    const item = text.replace(/^\s*-\s+/, '').trim();
    if (!item) {
      throw new BodyContractError('list items must be non-empty', expected, line);
    }
    items.push(parseItem(item, line));
  }
  if (items.length === 0) {
    throw new BodyContractError('list must contain at least one row', expected);
  }
  return items;
}

function nonEmptyLines(body: string) {
  return body
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter(({ text }) => Boolean(text));
}

function splitTableLine(line: string) {
  const cells: string[] = [];
  let cell = '';
  for (const character of line.trim()) {
    if (character !== '|') {
      cell += character;
      continue;
    }

    const precedingBackslashes = cell.match(/\\+$/)?.[0].length ?? 0;
    if (precedingBackslashes % 2 === 1) {
      cell = `${cell.slice(0, -1)}|`;
      continue;
    }
    cells.push(cell.trim());
    cell = '';
  }
  cells.push(cell.trim());

  if (cells[0] === '') {
    cells.shift();
  }
  if (cells.at(-1) === '') {
    cells.pop();
  }
  return cells;
}

export function markdownSyntaxSource(source: string) {
  const syntax = source.split('');
  const lines = source.matchAll(/.*(?:\r?\n|$)/g);
  let fence: { marker: string; length: number } | null = null;

  const mask = (start: number, end: number) => {
    for (let index = start; index < end; index += 1) {
      if (syntax[index] !== '\n' && syntax[index] !== '\r') {
        syntax[index] = ' ';
      }
    }
  };

  for (const lineMatch of lines) {
    const line = lineMatch[0].replace(/\r?\n$/, '');
    if (!line && lineMatch.index === source.length) {
      continue;
    }
    const lineStart = lineMatch.index;
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      mask(lineStart, lineStart + line.length);
      if (
        marker?.[0] === fence.marker &&
        marker.length >= fence.length &&
        new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`).test(line)
      ) {
        fence = null;
      }
      continue;
    }
    if (marker) {
      fence = { marker: marker[0], length: marker.length };
      mask(lineStart, lineStart + line.length);
      continue;
    }
    if (/^(?: {4}|\t)/.test(line)) {
      mask(lineStart, lineStart + line.length);
      continue;
    }

    let offset = 0;
    while (offset < line.length) {
      const character = line[offset];
      if (character === '\\' && offset + 1 < line.length) {
        mask(lineStart + offset, lineStart + offset + 2);
        offset += 2;
        continue;
      }
      if (character === '`') {
        const runLength = line.slice(offset).match(/^`+/)?.[0].length ?? 1;
        const closing = line.indexOf('`'.repeat(runLength), offset + runLength);
        if (closing >= 0) {
          mask(lineStart + offset, lineStart + closing + runLength);
          offset = closing + runLength;
          continue;
        }
      }
      if (character === '<') {
        const autolink = line
          .slice(offset)
          .match(/^<(?:https?:\/\/|mailto:)[^<>\s]+>|^<[^<>\s@]+@[^<>\s@]+>/i)?.[0];
        if (autolink) {
          mask(lineStart + offset, lineStart + offset + autolink.length);
          offset += autolink.length;
          continue;
        }
      }
      offset += 1;
    }
  }
  return syntax.join('');
}

function firstMatch(source: string, pattern: RegExp) {
  const match = pattern.exec(source);
  if (!match || match.index === undefined) {
    return null;
  }
  const before = source.slice(0, match.index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}
