import * as builtinDefinitions from './components/builtins';
import * as shadcnDefinitions from './components/shadcn';

// The runtime is React-only; the package manifest is the merged component
// contract (built-ins + shadcn pack), emitted as dist/components.json.
export {
  createReactComponentManifest as createComponentManifest,
  type HtmdxReactComponentManifest as HtmdxComponentManifest,
  type HtmdxReactManifestEntry as HtmdxManifestComponent,
} from './react/component-manifest';
import { createReactComponentManifest } from './react/component-manifest';

// Rollup compiles these examples against the transitional merged runtime
// before it publishes the manifest.
export const canonicalExamples = [
  ...Object.values(builtinDefinitions),
  ...Object.values(shadcnDefinitions),
].map(({ name, example }) => ({ name, example }));

export default createReactComponentManifest();
