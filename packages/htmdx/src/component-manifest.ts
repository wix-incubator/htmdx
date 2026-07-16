// The runtime is React-only; the package manifest is the merged component
// contract (built-ins + shadcn pack), emitted as dist/components.json.
export {
  createReactComponentManifest as createComponentManifest,
  type HtmdxReactComponentManifest as HtmdxComponentManifest,
  type HtmdxReactManifestEntry as HtmdxManifestComponent,
} from './react/component-manifest';
import { createReactComponentManifest } from './react/component-manifest';

export default createReactComponentManifest();
