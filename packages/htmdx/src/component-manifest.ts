import type { HtmdxBodyFormat, HtmdxComponent, HtmdxProp } from './component-definition';
import { bodyFormatExpectation } from './components/body-contracts';
import * as builtinDefinitions from './components/builtins';
import * as shadcnDefinitions from './components/shadcn';
import { VERSION } from './version';

export type HtmdxManifestComponent = {
  name: string;
  purpose: string;
  example: string;
  body: HtmdxComponent['body'];
  bodyFormat?: HtmdxBodyFormat;
  bodyExpectation?: string;
  props: readonly HtmdxProp[];
  source: 'built-in' | 'shadcn';
};

export type HtmdxComponentManifest = {
  format: 'htmdx@2';
  runtime: string;
  note: string;
  components: HtmdxManifestComponent[];
};

const MANIFEST_NOTE =
  'Body values: markdown passes raw Markdown and does not allow nested tags; htmdx allows Markdown, HTML, and nested registered component tags; none allows no body. Every markdown body also carries bodyFormat, the grammar its content is parsed with, and bodyExpectation, the shape a valid body must have: markdown accepts any Markdown, while label-value-list, label-number-list, gfm-table, and markdown-list-cards reject content that does not match and are not interchangeable with each other. Every component accepts class, id, aria-*, and data-* attributes; all other props must be declared, and an empty props list means the component accepts no component-specific props at all. Declared string values stay strings, number values must be finite numbers, boolean values use a bare attribute or true/false, and JSON values must parse as valid JSON before declared constraints run. HTMDX is declarative: imports, exports, brace expressions, event handlers, and function-valued props are not allowed.';

function projectDefinition(
  definition: HtmdxComponent,
  source: HtmdxManifestComponent['source'],
): HtmdxManifestComponent {
  const { name, purpose, example, body, props } = definition;
  // Only markdown bodies are parsed with a grammar, and an undeclared grammar
  // means plain Markdown. htmdx and none bodies carry no format at all.
  const bodyFormat = body === 'markdown' ? (definition.bodyFormat ?? 'markdown') : null;
  return {
    name,
    purpose,
    example,
    body,
    ...(bodyFormat ? { bodyFormat, bodyExpectation: bodyFormatExpectation(bodyFormat) } : {}),
    props: props ?? [],
    source,
  };
}

export function createComponentManifest(version: string = VERSION): HtmdxComponentManifest {
  return {
    format: 'htmdx@2',
    runtime: `@wix/htmdx@${version}`,
    note: MANIFEST_NOTE,
    components: [
      ...Object.values(builtinDefinitions).map((definition) =>
        projectDefinition(definition, 'built-in'),
      ),
      ...Object.values(shadcnDefinitions).map((definition) =>
        projectDefinition(definition, 'shadcn'),
      ),
    ],
  };
}

export const canonicalExamples = [
  ...Object.values(builtinDefinitions),
  ...Object.values(shadcnDefinitions),
].map(({ name, example }) => ({ name, example }));

export default createComponentManifest();
