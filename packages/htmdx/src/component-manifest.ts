// The runtime is React-only; the package manifest is the merged component
// contract (built-ins + shadcn pack), emitted as dist/components.json.
export {
  createReactComponentManifest as createComponentManifest,
  type HtmdxReactComponentManifest as HtmdxComponentManifest,
  type HtmdxReactManifestEntry as HtmdxManifestComponent,
} from './components/manifest';
import { createReactComponentManifest } from './components/manifest';

export default createReactComponentManifest();
