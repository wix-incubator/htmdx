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
  'This manifest lists the components served by dist/browser-react.js and the @wix/htmdx/react entries: the string built-ins (bridged, body contracts unchanged) plus the shadcn/ui pack. On the Card name collision the shadcn component wins. shadcn components allow nested composition and markdown bodies; builtin components keep their declared body format. Attributes are data only: class -> className, kebab-case -> camelCase, values parse as booleans/numbers/JSON. Imports, expressions, and function-valued props cannot be expressed.';

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
