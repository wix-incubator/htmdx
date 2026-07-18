import type { HtmdxComponent, HtmdxProp } from '../component-definition';
import * as builtinDefinitionExports from '../components/builtins';
import { builtInComponents } from '../components/catalog';
import * as shadcnDefinitionExports from '../components/shadcn';
import type { HtmdxBodyFormat } from '../components/types';
import { VERSION } from '../version';
import { shadcnManifestComponents, type HtmdxReactManifestProp } from './shadcn/manifest';

export type HtmdxReactManifestEntry = {
  name: string;
  purpose: string;
  example?: string;
  body?: HtmdxBodyFormat | HtmdxComponent['body'];
  props?: readonly (HtmdxReactManifestProp | HtmdxProp)[];
  source: 'builtin' | 'built-in' | 'shadcn';
};

export type HtmdxReactComponentManifest = {
  format: 'htmdx-react@1';
  runtime: string;
  note: string;
  components: HtmdxReactManifestEntry[];
};

const MANIFEST_NOTE =
  'This manifest lists the components in the htmdx React runtime (dist/browser.js and the module entries): the built-in catalog plus the shadcn/ui pack. shadcn components allow nested composition and markdown bodies; builtin components keep their declared body format. Attributes are data only: class -> className, kebab-case -> camelCase, values parse as booleans/numbers/JSON. Imports, expressions, and function-valued props cannot be expressed. Definition-driven entries (source built-in, plus migrated shadcn entries) declare body as markdown (raw Markdown body, no nested tags), htmdx (Markdown, HTML, and nested component tags), or none (no body); their props list is the authoritative allowlist beside the universally allowed class, id, aria-* and data-* attributes.';

// Migrated components are projected straight from their category-barrel
// definitions: agent-facing fields plus a generated source, never the
// executable Component.
function projectDefinition(
  definition: HtmdxComponent,
  source: 'built-in' | 'shadcn',
): HtmdxReactManifestEntry {
  const { name, purpose, example, body, props } = definition;
  return { name, purpose, example, body, ...(props ? { props } : {}), source };
}

export function createReactComponentManifest(
  version: string = VERSION,
): HtmdxReactComponentManifest {
  const migratedBuiltins = Object.values(builtinDefinitionExports).map((definition) =>
    projectDefinition(definition, 'built-in'),
  );
  const migratedShadcn = Object.values(shadcnDefinitionExports).map((definition) =>
    projectDefinition(definition, 'shadcn'),
  );

  const builtins: HtmdxReactManifestEntry[] = builtInComponents.map(
    ({ name, body, purpose, example }) => ({
      name,
      purpose,
      example,
      body,
      source: 'builtin',
    }),
  );

  const shadcn: HtmdxReactManifestEntry[] = shadcnManifestComponents.map((component) => ({
    ...component,
    source: 'shadcn',
  }));

  return {
    format: 'htmdx-react@1',
    runtime: `@wix/htmdx@${version}`,
    note: MANIFEST_NOTE,
    components: [...migratedBuiltins, ...builtins, ...shadcn, ...migratedShadcn],
  };
}

export default createReactComponentManifest();
