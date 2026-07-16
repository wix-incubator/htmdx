import { builtInComponents } from '../components/catalog';
import type { HtmdxBodyFormat } from '../components/types';
import { VERSION } from '../version';
import { shadcnManifestComponents, type HtmdxReactManifestComponent } from './shadcn/manifest';

export type HtmdxReactManifestEntry = HtmdxReactManifestComponent & {
  source: 'builtin' | 'shadcn';
  body?: HtmdxBodyFormat;
};

export type HtmdxReactComponentManifest = {
  format: 'htmdx-react@1';
  runtime: string;
  note: string;
  components: HtmdxReactManifestEntry[];
};

const MANIFEST_NOTE =
  'This manifest lists the components in the htmdx React runtime (dist/browser.js and the module entries): the built-in catalog plus the shadcn/ui pack. shadcn components allow nested composition and markdown bodies; builtin components keep their declared body format. Attributes are data only: class -> className, kebab-case -> camelCase, values parse as booleans/numbers/JSON. Imports, expressions, and function-valued props cannot be expressed.';

const shadcnNames = new Set(shadcnManifestComponents.map((component) => component.name));

export function createReactComponentManifest(
  version: string = VERSION,
): HtmdxReactComponentManifest {
  const builtins: HtmdxReactManifestEntry[] = builtInComponents
    .filter((component) => !shadcnNames.has(component.name))
    .map(({ name, body, purpose, example }) => ({
      name,
      purpose,
      example,
      body,
      source: 'builtin',
    }));

  const shadcn: HtmdxReactManifestEntry[] = shadcnManifestComponents.map((component) => ({
    ...component,
    source: 'shadcn',
  }));

  return {
    format: 'htmdx-react@1',
    runtime: `@wix/htmdx@${version}`,
    note: MANIFEST_NOTE,
    components: [...builtins, ...shadcn],
  };
}

export default createReactComponentManifest();
