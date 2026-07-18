import type { HtmdxComponent } from './types';

// All Built-ins now flow through the definition catalog. Keep the legacy
// catalog empty until the compatibility adapters are removed with the v4 API.
export const builtInComponents = [] as const satisfies readonly HtmdxComponent[];
