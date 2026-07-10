import type { HtmdxBodyFormat, HtmdxParsedBody, ParsedBodyByFormat } from './types';

export type LabelValue = { label: string; value: string };
export type LabelNumber = { label: string; value: number };
export type GfmTable = { header: string[]; rows: string[][] };
export type MarkdownListCards = { items: string[]; lines: number[] };

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

  const lines = body.split(/\r?\n/);
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

  const expression = firstMatch(body, /[{}]/);
  if (expression) {
    throw new BodyContractError(
      'MDX expressions are not allowed',
      'content without brace expressions',
      expression.line,
      expression.column,
    );
  }

  const jsx = firstMatch(body, /<[A-Za-z][A-Za-z0-9]*\b/);
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
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
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
