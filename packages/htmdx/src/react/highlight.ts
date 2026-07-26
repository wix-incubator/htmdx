// Syntax highlighting for fenced and raw code blocks. A grammar is an ordered
// list of sticky patterns; the scanner takes the first that matches at the
// cursor and falls back to one plain character. No dependency, no async setup:
// compile() is synchronous and artifacts are single files, so a WASM or
// grammar-bundle highlighter (Shiki, Prism) is not an option here.
export type CodeTokenType =
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'function'
  | 'type'
  | 'property'
  | 'tag'
  | 'attribute'
  | 'operator'
  | 'punctuation'
  | 'inserted'
  | 'deleted'
  | 'plain';

export type CodeToken = { type: CodeTokenType; value: string };

type Rule = { type: CodeTokenType; pattern: RegExp; expand?: Grammar };
type Grammar = Rule[];

// Highlighting a generated file or a pasted log is wasted work that scales with
// the input, so past this size the block stays plain text.
const MAX_HIGHLIGHTED_LENGTH = 20000;

const rule = (type: CodeTokenType, source: string, expand?: Grammar): Rule => ({
  type,
  pattern: new RegExp(source, 'y'),
  expand,
});

const SCRIPT_KEYWORDS = [
  'abstract',
  'any',
  'as',
  'async',
  'await',
  'bigint',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'namespace',
  'never',
  'new',
  'null',
  'number',
  'object',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'satisfies',
  'set',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unknown',
  'var',
  'void',
  'while',
  'yield',
];

const PYTHON_KEYWORDS = [
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'False',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'None',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'True',
  'try',
  'while',
  'with',
  'yield',
];

const SHELL_KEYWORDS = [
  'case',
  'cd',
  'do',
  'done',
  'echo',
  'elif',
  'else',
  'esac',
  'exit',
  'export',
  'fi',
  'for',
  'function',
  'if',
  'in',
  'local',
  'return',
  'set',
  'source',
  'then',
  'while',
];

const words = (list: string[]) => `\\b(?:${list.join('|')})\\b`;

const SCRIPT: Grammar = [
  rule('comment', '//[^\\n]*|/\\*[\\s\\S]*?\\*/'),
  rule(
    'string',
    '`(?:[^`\\\\]|\\\\[\\s\\S])*`?|"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'',
  ),
  rule('number', '\\b(?:0[xXbBoO][\\da-fA-F_]+|\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?\\d+)?)n?\\b'),
  rule('keyword', words(SCRIPT_KEYWORDS)),
  rule('function', '\\b[A-Za-z_$][\\w$]*(?=\\s*[(<])'),
  rule('type', '\\b[A-Z][\\w$]*\\b'),
  // Only where a key can start, so the annotation in `const x: number` does not
  // turn the variable into a property.
  rule('property', '(?<=[{,\\n]\\s*)[A-Za-z_$][\\w$]*(?=\\s*:)'),
  rule('operator', '=>|[+\\-*/%=<>!&|^~?]+'),
  rule('punctuation', '[{}\\[\\]();,.:]'),
];

const JSON_GRAMMAR: Grammar = [
  rule('property', '"(?:[^"\\\\]|\\\\.)*"(?=\\s*:)'),
  rule('string', '"(?:[^"\\\\]|\\\\.)*"'),
  rule('number', '-?\\b\\d[\\d.]*(?:[eE][+-]?\\d+)?\\b'),
  rule('keyword', '\\b(?:true|false|null)\\b'),
  rule('punctuation', '[{}\\[\\],:]'),
];

// A tag is matched whole and re-scanned, so an attribute pattern can never fire
// against prose between tags.
const TAG_INTERNALS: Grammar = [
  rule('string', '"[^"]*"|\'[^\']*\''),
  rule('tag', '</?[A-Za-z][\\w:.-]*'),
  rule('attribute', '[A-Za-z_:][\\w:.-]*'),
  rule('operator', '='),
  rule('punctuation', '/?>'),
];

const MARKUP: Grammar = [
  rule('comment', '<!--[\\s\\S]*?-->'),
  rule('keyword', '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>|<![A-Za-z][^>]*>'),
  rule('tag', '</?[A-Za-z][\\w:.-]*(?:"[^"]*"|\'[^\']*\'|[^>"\'])*/?>', TAG_INTERNALS),
  rule('number', '&#?[\\w-]+;'),
];

const CSS_GRAMMAR: Grammar = [
  rule('comment', '/\\*[\\s\\S]*?\\*/|//[^\\n]*'),
  rule('string', '"[^"\\n]*"|\'[^\'\\n]*\''),
  rule('keyword', '@[\\w-]+'),
  rule('number', '#[0-9a-fA-F]{3,8}\\b|\\b\\d[\\d.]*(?:%|[a-z]{1,4})?\\b'),
  rule('property', '[-a-zA-Z][-\\w]*(?=\\s*:)'),
  rule('function', '[-\\w]+(?=\\()'),
  rule('type', '[.#][-\\w]+|::?[a-z-]+|&'),
  rule('punctuation', '[{}();,]'),
];

const SHELL: Grammar = [
  rule('comment', '#[^\\n]*'),
  rule('string', '"(?:[^"\\\\]|\\\\.)*"|\'[^\']*\''),
  rule('property', '\\$\\{[^}]*\\}|\\$[\\w@?#*!-]+'),
  rule('keyword', words(SHELL_KEYWORDS)),
  rule('operator', '\\B--?[\\w-]+|[|&;<>]+'),
  rule('number', '\\b\\d+\\b'),
];

const PYTHON: Grammar = [
  rule('comment', '#[^\\n]*'),
  rule(
    'string',
    '[rbfu]{0,2}(?:"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\')',
  ),
  rule('type', '@[\\w.]+'),
  rule('number', '\\b\\d[\\d_]*(?:\\.[\\d_]+)?\\b'),
  rule('keyword', words(PYTHON_KEYWORDS)),
  rule('function', '\\b[A-Za-z_]\\w*(?=\\s*\\()'),
  rule('punctuation', '[{}\\[\\]();,.:]'),
];

const YAML: Grammar = [
  rule('comment', '#[^\\n]*'),
  rule('string', '"(?:[^"\\\\]|\\\\.)*"|\'[^\']*\''),
  rule('property', '[\\w.$-]+(?=\\s*:)'),
  rule('keyword', '\\b(?:true|false|null|yes|no|on|off)\\b'),
  rule('number', '\\b\\d[\\d.]*\\b'),
  rule('punctuation', '[:\\[\\]{},]|(?:^|(?<=\\n))\\s*-(?=\\s)'),
];

const SQL: Grammar = [
  rule('comment', '--[^\\n]*|/\\*[\\s\\S]*?\\*/'),
  rule('string', "'(?:[^'\\\\]|''|\\\\.)*'"),
  rule(
    'keyword',
    '\\b(?:ALTER|AND|AS|ASC|BY|CASE|CREATE|DELETE|DESC|DISTINCT|DROP|ELSE|END|EXISTS|FROM|GROUP|HAVING|IN|INDEX|INNER|INSERT|INTO|JOIN|LEFT|LIKE|LIMIT|NOT|NULL|OFFSET|ON|OR|ORDER|OUTER|RIGHT|SELECT|SET|TABLE|THEN|UNION|UPDATE|VALUES|WHEN|WHERE|WITH)\\b',
  ),
  rule('number', '\\b\\d[\\d.]*\\b'),
  rule('function', '\\b[A-Za-z_]\\w*(?=\\s*\\()'),
  rule('punctuation', '[();,.*]'),
];

// Line oriented: the marker column decides the whole line, so each rule anchors
// to a line start and swallows the newline with it.
const DIFF: Grammar = [
  rule('comment', '(?:^|(?<=\\n))(?:diff|index|---|\\+\\+\\+)[^\\n]*\\n?'),
  rule('keyword', '(?:^|(?<=\\n))@@[^\\n]*\\n?'),
  rule('inserted', '(?:^|(?<=\\n))\\+[^\\n]*\\n?'),
  rule('deleted', '(?:^|(?<=\\n))-[^\\n]*\\n?'),
];

const GRAMMARS = new Map<string, Grammar>([
  ['script', SCRIPT],
  ['json', JSON_GRAMMAR],
  ['markup', MARKUP],
  ['css', CSS_GRAMMAR],
  ['shell', SHELL],
  ['python', PYTHON],
  ['yaml', YAML],
  ['sql', SQL],
  ['diff', DIFF],
]);

const GRAMMAR_BY_LANGUAGE = new Map<string, string>(
  Object.entries({
    script:
      'c cpp csharp cs dart go java javascript js json5 jsonc jsx kotlin php rust scala swift ts tsx typescript',
    json: 'json',
    markup: 'html svelte svg vue xml',
    css: 'css less postcss sass scss',
    shell: 'bash console fish sh shell terminal zsh',
    python: 'py python',
    yaml: 'conf dockerfile env ini properties toml yaml yml',
    sql: 'sql',
    diff: 'diff patch',
  }).flatMap(([grammar, languages]) =>
    languages.split(' ').map((language) => [language, grammar] as [string, string]),
  ),
);

export function hasGrammar(language: string | undefined) {
  return Boolean(language && GRAMMAR_BY_LANGUAGE.has(language));
}

export function tokenizeCode(code: string, language: string | undefined): CodeToken[] {
  const grammar = language && GRAMMAR_BY_LANGUAGE.get(language);
  if (!grammar || code.length > MAX_HIGHLIGHTED_LENGTH) {
    return [{ type: 'plain', value: code }];
  }
  return scan(code, GRAMMARS.get(grammar) ?? SCRIPT);
}

function scan(code: string, grammar: Grammar): CodeToken[] {
  const tokens: CodeToken[] = [];
  let plain = '';
  let index = 0;

  const flush = () => {
    if (plain) {
      tokens.push({ type: 'plain', value: plain });
      plain = '';
    }
  };

  while (index < code.length) {
    const match = matchRule(code, index, grammar);
    if (!match) {
      plain += code[index];
      index += 1;
      continue;
    }
    flush();
    if (match.rule.expand) {
      tokens.push(...scan(match.value, match.rule.expand));
    } else {
      tokens.push({ type: match.rule.type, value: match.value });
    }
    index += match.value.length;
  }

  flush();
  return tokens;
}

function matchRule(code: string, index: number, grammar: Grammar) {
  for (const candidate of grammar) {
    candidate.pattern.lastIndex = index;
    const match = candidate.pattern.exec(code);
    if (match?.[0]) {
      return { rule: candidate, value: match[0] };
    }
  }
  return null;
}
