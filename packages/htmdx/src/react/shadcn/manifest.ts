// Machine-readable contract for the shadcn/ui pack, mirroring the built-ins
// manifest (dist/components.json) for the React runtime. Pure data — safe to
// import without react installed.

export type HtmdxReactManifestProp = {
  name: string;
  values?: string[];
  required?: boolean;
  description?: string;
};

export type HtmdxReactManifestComponent = {
  name: string;
  purpose: string;
  props?: HtmdxReactManifestProp[];
  example?: string;
};

export const shadcnManifestComponents: readonly HtmdxReactManifestComponent[] = [];
