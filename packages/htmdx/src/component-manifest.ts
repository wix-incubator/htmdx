import type { HtmdxComponent, HtmdxProp } from './component-definition';
import * as builtinDefinitions from './components/builtins';
import * as shadcnDefinitions from './components/shadcn';
import { VERSION } from './version';

export type HtmdxManifestComponent = {
  name: string;
  purpose: string;
  example: string;
  body: HtmdxComponent['body'];
  props?: readonly HtmdxProp[];
  source: 'built-in' | 'shadcn';
};

export type HtmdxComponentManifest = {
  format: 'htmdx@2';
  runtime: string;
  note: string;
  components: HtmdxManifestComponent[];
};

const MANIFEST_NOTE =
  'Body values: markdown passes raw Markdown and does not allow nested tags; htmdx allows Markdown, HTML, and nested registered component tags; none allows no body. Every component accepts class, id, aria-*, and data-* attributes; all other props must be declared. Declared string values stay strings, number values must be finite numbers, boolean values use a bare attribute or true/false, and JSON values must parse as valid JSON before declared constraints run. HTMDX is declarative: imports, exports, brace expressions, event handlers, and function-valued props are not allowed.';

function projectDefinition(
  definition: HtmdxComponent,
  source: HtmdxManifestComponent['source'],
): HtmdxManifestComponent {
  const { name, purpose, example, body, props } = definition;
  return { name, purpose, example, body, ...(props ? { props } : {}), source };
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
