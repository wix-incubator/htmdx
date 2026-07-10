import { builtInComponents } from './components/catalog';
import type { HtmdxBodyFormat, HtmdxComponent } from './components/types';
import { VERSION } from './version';

export type HtmdxManifestComponent = {
  name: string;
  body: HtmdxBodyFormat;
  purpose: string;
  example: string;
};

export type HtmdxComponentManifest = {
  format: 'htmdx@1';
  runtime: string;
  note: string;
  components: HtmdxManifestComponent[];
};

const MANIFEST_NOTE =
  'This manifest lists @wix/htmdx built-ins only. Component bodies use Markdown-shaped, one-level JSX: imports, exports, expressions, and nested JSX are forbidden. Every body must match its declared format; an invalid body fails compilation of the whole HTMDX artifact.';

export function createComponentManifest(
  components: readonly HtmdxComponent[] = builtInComponents,
  version: string = VERSION,
): HtmdxComponentManifest {
  return {
    format: 'htmdx@1',
    runtime: `@wix/htmdx@${version}`,
    note: MANIFEST_NOTE,
    components: components.map(({ name, body, purpose, example }) => ({
      name,
      body,
      purpose,
      example,
    })),
  };
}

export default createComponentManifest();
