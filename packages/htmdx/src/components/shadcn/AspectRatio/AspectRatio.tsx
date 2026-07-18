// Vendored shadcn/ui aspect-ratio (new-york), unmodified apart from the
// individual @radix-ui import and the deliberate per-component split.
// Internal to this folder — the public contract is exported from ./index.ts.
import * as React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

function AspectRatio({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
